"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ACK_STATUSES, REASON_CODES } from "@scp/domain";
import { useState } from "react";
import { api, type PurchaseOrderRecord } from "@/lib/api";
import { formatDate, formatQty } from "@/lib/format";

type Me = { partyType: string; partnerId: string | null };

export function PurchaseOrderDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      return res.json() as Promise<Me>;
    },
  });
  const { data, isLoading, error } = useQuery({
    queryKey: ["po", id],
    queryFn: () => api<PurchaseOrderRecord>(`/purchase-orders/${id}`),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["po", id] });
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    queryClient.invalidateQueries({ queryKey: ["exceptions"] });
  }

  if (isLoading) return <p className="lede">Loading PO…</p>;
  if (error) return <p className="error-text">{(error as Error).message}</p>;
  if (!data) return null;

  const isSupplier = me.data?.partyType === "supplier" && me.data.partnerId === data.supplierId;
  const isBuyer = me.data?.partyType === "buyer" && me.data.partnerId === data.buyerId;

  return (
    <>
      <p className="lede">
        Binding schedule from <span className="mono">{data.sourceCommitId}</span> v
        {data.sourceCommitVersion}
        {data.forecastId ? (
          <>
            {" "}
            on <span className="mono">{data.forecastId}</span>
          </>
        ) : null}
        . Green is reserved for this record, not for planning-grade forecasts.
      </p>
      <dl className="meta-grid">
        <div>
          <dt>Firm qty / date</dt>
          <dd>
            {formatQty(data.firmQty)} · {formatDate(data.firmDate)}
          </dd>
        </div>
        <div>
          <dt>Last promise</dt>
          <dd>
            {data.latestAck
              ? `${formatQty(data.latestAck.promiseQty)} · ${formatDate(data.latestAck.promiseDate)}`
              : "Not acknowledged"}
          </dd>
        </div>
        <div>
          <dt>OTIF</dt>
          <dd>
            {data.otif?.otif === true
              ? "on time vs promise"
              : data.otif?.otif === false
                ? "late vs promise"
                : "— (needs receipt and a promise date)"}
          </dd>
        </div>
      </dl>

      <section className="panel">
        <h2>Acknowledgements</h2>
        {data.acknowledgements.length === 0 ? (
          <p className="lede">Supplier has not acknowledged this schedule line.</p>
        ) : (
          <ul>
            {data.acknowledgements.map((a) => (
              <li key={a.id}>
                {a.ackStatus} · {formatQty(a.promiseQty)} · {formatDate(a.promiseDate)}
                {a.changeReason ? <span className="mono"> · {a.changeReason}</span> : null}
              </li>
            ))}
          </ul>
        )}
        {isSupplier ? <AckForm id={id} seed={data} onDone={refresh} /> : null}
      </section>

      <section className="panel">
        <h2>Execution (ASN / receipt)</h2>
        {data.execution.length === 0 ? (
          <p className="lede">No shipped or received qty referenced from ERP/MES.</p>
        ) : (
          <ul>
            {data.execution.map((e) => (
              <li key={e.id}>
                {e.eventType} <span className="mono">{e.externalId}</span> ·{" "}
                {e.qty ? formatQty(e.qty) : "—"}
              </li>
            ))}
          </ul>
        )}
        {isBuyer ? <ReceiptForm id={id} onDone={refresh} /> : null}
      </section>

      {isBuyer || isSupplier ? <ChangeOrderForm id={id} onDone={refresh} /> : null}
    </>
  );
}

function AckForm({
  id,
  seed,
  onDone,
}: {
  id: string;
  seed: PurchaseOrderRecord;
  onDone: () => void;
}) {
  const [ackStatus, setAckStatus] = useState<(typeof ACK_STATUSES)[number]>("accepted");
  const [promiseQty, setPromiseQty] = useState(String(Number(seed.firmQty)));
  const [promiseDate, setPromiseDate] = useState(seed.firmDate);
  const [changeReason, setChangeReason] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      api(`/purchase-orders/${id}/acknowledgements`, {
        method: "POST",
        body: JSON.stringify({
          ackStatus,
          promiseQty,
          promiseDate,
          changeReason: changeReason || null,
        }),
      }),
    onSuccess: onDone,
  });
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <label>
        Ack status
        <select
          value={ackStatus}
          onChange={(e) => setAckStatus(e.target.value as (typeof ACK_STATUSES)[number])}
        >
          {ACK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label>
        Promise qty
        <input value={promiseQty} onChange={(e) => setPromiseQty(e.target.value)} />
      </label>
      <label>
        Promise date
        <input type="date" value={promiseDate} onChange={(e) => setPromiseDate(e.target.value)} />
      </label>
      <label>
        Change reason
        <select value={changeReason} onChange={(e) => setChangeReason(e.target.value)}>
          <option value="">required unless accepted as-is</option>
          {REASON_CODES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      {mutation.error ? <p className="error-text">{(mutation.error as Error).message}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
        Acknowledge
      </button>
    </form>
  );
}

function ReceiptForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [externalId, setExternalId] = useState("");
  const [qty, setQty] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const mutation = useMutation({
    mutationFn: () =>
      api(`/purchase-orders/${id}/execution`, {
        method: "POST",
        body: JSON.stringify({
          eventType: "receipt",
          externalId,
          qty: qty || null,
          occurredAt: new Date(occurredAt).toISOString(),
        }),
      }),
    onSuccess: onDone,
  });
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <label>
        Receipt id
        <input value={externalId} onChange={(e) => setExternalId(e.target.value)} required />
      </label>
      <label>
        Qty
        <input value={qty} onChange={(e) => setQty(e.target.value)} />
      </label>
      <label>
        Occurred
        <input
          type="datetime-local"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
        />
      </label>
      {mutation.error ? <p className="error-text">{(mutation.error as Error).message}</p> : null}
      <button className="btn" type="submit" disabled={mutation.isPending}>
        Record receipt reference
      </button>
    </form>
  );
}

function ChangeOrderForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [proposedQty, setProposedQty] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [reasonCode, setReasonCode] = useState<(typeof REASON_CODES)[number]>("OTHER");
  const mutation = useMutation({
    mutationFn: () =>
      api(`/purchase-orders/${id}/change-orders`, {
        method: "POST",
        body: JSON.stringify({
          proposedQty: proposedQty || null,
          proposedDate: proposedDate || null,
          reasonCode,
        }),
      }),
    onSuccess: onDone,
  });
  return (
    <section className="panel">
      <h2>Propose change order</h2>
      <p className="lede">
        Post-firm-fence amendments need a <code>reason_code</code>. Both parties must accept
        before the last promise date moves.
      </p>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label>
          Proposed qty
          <input value={proposedQty} onChange={(e) => setProposedQty(e.target.value)} />
        </label>
        <label>
          Proposed date
          <input
            type="date"
            value={proposedDate}
            onChange={(e) => setProposedDate(e.target.value)}
          />
        </label>
        <label>
          Reason
          <select
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value as (typeof REASON_CODES)[number])}
          >
            {REASON_CODES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        {mutation.error ? <p className="error-text">{(mutation.error as Error).message}</p> : null}
        <button className="btn" type="submit" disabled={mutation.isPending}>
          Propose
        </button>
      </form>
    </section>
  );
}
