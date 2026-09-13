import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  changeOrders,
  exceptions,
  executionEvents,
  forecastCommits,
  forecastLines,
  otifMetrics,
  poAcknowledgements,
  purchaseOrders,
  tradingPartnerSetups,
} from "@scp/db";
import type { AcknowledgeExceptionInput, ExceptionType } from "@scp/domain";
import { DOMAIN_EVENTS } from "@scp/event-contracts";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { addBusinessDays, toIso } from "../../common/dates";
import { DbService } from "../../db/db.service";
import { auditEvents, domainEvents } from "@scp/db";
import type { SessionClaims } from "../auth/token";

const SYSTEM = "system.scp";
const ACTIVE = ["offered", "accepted"] as const;

type LineRow = typeof forecastLines.$inferSelect;
type CommitRow = typeof forecastCommits.$inferSelect;
type ExceptionRow = typeof exceptions.$inferSelect;

@Injectable()
export class ExceptionService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db;
  }

  async list() {
    await this.scan();
    const rows = await this.db.select().from(exceptions).orderBy(desc(exceptions.openedAt));
    const bundles = [];
    for (const row of rows) {
      bundles.push(await this.serialize(row));
    }
    return bundles;
  }

  async get(id: string) {
    const [row] = await this.db.select().from(exceptions).where(eq(exceptions.id, id));
    if (!row) throw new NotFoundException("Exception not found");
    return this.serialize(row);
  }

  async acknowledge(id: string, input: AcknowledgeExceptionInput, user: SessionClaims) {
    if (!user) throw new ForbiddenException("Sign in required");
    const [row] = await this.db.select().from(exceptions).where(eq(exceptions.id, id));
    if (!row) throw new NotFoundException("Exception not found");
    if (row.status === "resolved") {
      throw new ForbiddenException("Resolved exceptions cannot be acknowledged");
    }
    const [updated] = await this.db
      .update(exceptions)
      .set({
        status: "acknowledged",
        acknowledgedAt: new Date(),
        acknowledgedBy: user.sub,
      })
      .where(eq(exceptions.id, id))
      .returning();
    await this.db.insert(auditEvents).values({
      actorId: user.sub,
      entityType: "exception",
      entityId: id,
      action: "acknowledge",
      reasonCode: null,
      payload: { note: input.note ?? null, exceptionType: row.exceptionType },
    });
    return this.serialize(updated!);
  }

  async scan() {
    const published = (await this.db.select().from(forecastLines)).filter(
      (l) => l.status === "published",
    );
    let opened = 0;
    let resolved = 0;
    for (const line of published) {
      const result = await this.scanLine(line);
      opened += result.opened;
      resolved += result.resolved;
    }
    return { scanned: published.length, opened, resolved };
  }

  private async scanLine(line: LineRow) {
    const [tpa] = await this.db
      .select()
      .from(tradingPartnerSetups)
      .where(eq(tradingPartnerSetups.id, line.tradingPartnerSetupId));
    if (!tpa || !line.publishedAt) return { opened: 0, resolved: 0 };

    const commits = this.pickCurrent(
      await this.db
        .select()
        .from(forecastCommits)
        .where(eq(forecastCommits.parentForecastLineId, line.id)),
    );
    const active = commits.filter(
      (c) => ACTIVE.includes(c.status as (typeof ACTIVE)[number]) && Number(c.committedQty) > 0,
    );
    const remainder = commits.find(
      (c) =>
        ACTIVE.includes(c.status as (typeof ACTIVE)[number]) &&
        Number(c.committedQty) === 0 &&
        c.reasonCode,
    );
    const committedQty = active.reduce((sum, c) => sum + Number(c.committedQty), 0);
    const gapQty = Number(line.requestedQty) - committedQty;
    const hasResponse = commits.length > 0;
    const publishedAt =
      line.publishedAt instanceof Date ? line.publishedAt : new Date(line.publishedAt);
    const dueAt = addBusinessDays(publishedAt, tpa.responseSlaBusinessDays);
    const overdue = Date.now() > dueAt.getTime();

    let opened = 0;
    let resolved = 0;

    const slaNeeded = !hasResponse && overdue;
    const sla = await this.upsert({
      type: "sla_silence",
      line,
      commitId: null,
      needed: slaNeeded,
      slaBusinessDays: tpa.responseSlaBusinessDays,
      dueAt,
      reasonCode: null,
      summary: slaNeeded
        ? `${line.forecastId} v${line.version} has no supplier response after ${tpa.responseSlaBusinessDays} business days. Silence is not acceptance.`
        : `${line.forecastId} v${line.version} SLA is current.`,
      payload: {
        publishedAt: toIso(publishedAt),
        dueAt: toIso(dueAt),
        responseSlaBusinessDays: tpa.responseSlaBusinessDays,
        autoAccepted: false,
      },
    });
    opened += sla.opened;
    resolved += sla.resolved;

    const gapNeeded = hasResponse && gapQty > 0;
    const gap = await this.upsert({
      type: "gap",
      line,
      commitId: remainder?.commitId ?? null,
      needed: gapNeeded,
      slaBusinessDays: tpa.responseSlaBusinessDays,
      dueAt,
      reasonCode: remainder?.reasonCode ?? null,
      summary: gapNeeded
        ? `${line.forecastId} v${line.version} has ${gapQty.toFixed(0)} uncommitted${
            remainder?.reasonCode ? ` (${remainder.reasonCode})` : ""
          }.`
        : `${line.forecastId} v${line.version} has no open gap.`,
      payload: {
        requestedQty: line.requestedQty,
        committedQty: committedQty.toFixed(4),
        gapQty: gapQty.toFixed(4),
        gapReasonCode: remainder?.reasonCode ?? null,
      },
    });
    opened += gap.opened;
    resolved += gap.resolved;

    const lateRows = active.filter(
      (c) => c.committedDate && c.committedDate > line.requestedDate,
    );
    const lateIds = new Set(lateRows.map((c) => c.commitId));
    const existingLate = await this.db
      .select()
      .from(exceptions)
      .where(
        and(eq(exceptions.forecastLineId, line.id), eq(exceptions.exceptionType, "late")),
      );
    for (const row of lateRows) {
      const lateQty = Number(row.committedQty);
      const result = await this.upsert({
        type: "late",
        line,
        commitId: row.commitId,
        needed: true,
        slaBusinessDays: tpa.responseSlaBusinessDays,
        dueAt,
        reasonCode: row.reasonCode,
        summary: `${row.commitId} promises ${lateQty.toFixed(0)} after the requested ${line.needByConvention} ${line.requestedDate}. Lateness is a planning fact, not a binding miss until a PO promise exists.`,
        payload: {
          requestedDate: line.requestedDate,
          committedDate: row.committedDate,
          committedQty: row.committedQty,
          commitGrade: row.commitGrade,
        },
      });
      opened += result.opened;
      resolved += result.resolved;
    }
    for (const row of existingLate) {
      if (row.commitId && !lateIds.has(row.commitId) && row.status !== "resolved") {
        const result = await this.upsert({
          type: "late",
          line,
          commitId: row.commitId,
          needed: false,
          slaBusinessDays: tpa.responseSlaBusinessDays,
          dueAt,
          reasonCode: row.reasonCode,
          summary: `${row.commitId} is no longer late against this published request.`,
          payload: {},
        });
        resolved += result.resolved;
      }
    }

    return { opened, resolved };
  }

  private async upsert(input: {
    type: ExceptionType;
    line: LineRow;
    commitId: string | null;
    needed: boolean;
    slaBusinessDays: number;
    dueAt: Date;
    reasonCode: CommitRow["reasonCode"];
    summary: string;
    payload: Record<string, unknown>;
  }) {
    const existing = await this.findExisting(input.type, input.line.id, input.commitId);
    if (input.needed) {
      if (!existing) {
        await this.db.insert(exceptions).values({
          exceptionType: input.type,
          status: "open",
          forecastId: input.line.forecastId,
          forecastLineId: input.line.id,
          forecastVersion: input.line.version,
          commitId: input.commitId,
          tradingPartnerSetupId: input.line.tradingPartnerSetupId,
          slaBusinessDays: input.slaBusinessDays,
          dueAt: input.dueAt,
          reasonCode: input.reasonCode,
          summary: input.summary,
          payload: input.payload,
        });
        if (input.type === "sla_silence") {
          await this.db.insert(domainEvents).values({
            eventName: DOMAIN_EVENTS.SlaBreached,
            aggregateType: "exception",
            aggregateId: input.line.forecastId,
            aggregateVersion: String(input.line.version),
            actorId: SYSTEM,
            payload: {
              exceptionType: input.type,
              forecastId: input.line.forecastId,
              forecastVersion: input.line.version,
              commitId: input.commitId,
              autoAccepted: false,
              ...input.payload,
            },
          });
        }
        await this.db.insert(auditEvents).values({
          actorId: SYSTEM,
          entityType: "exception",
          entityId: `${input.type}:${input.line.forecastId}:v${input.line.version}`,
          action: "open",
          reasonCode: input.reasonCode,
          payload: { exceptionType: input.type, ...input.payload },
        });
        return { opened: 1, resolved: 0 };
      }
      if (existing.status === "resolved") {
        await this.db
          .update(exceptions)
          .set({
            status: "open",
            openedAt: new Date(),
            resolvedAt: null,
            resolvedBy: null,
            summary: input.summary,
            payload: input.payload,
            dueAt: input.dueAt,
            slaBusinessDays: input.slaBusinessDays,
            reasonCode: input.reasonCode,
          })
          .where(eq(exceptions.id, existing.id));
        return { opened: 1, resolved: 0 };
      }
      await this.db
        .update(exceptions)
        .set({
          summary: input.summary,
          payload: input.payload,
          dueAt: input.dueAt,
          slaBusinessDays: input.slaBusinessDays,
          reasonCode: input.reasonCode,
        })
        .where(eq(exceptions.id, existing.id));
      return { opened: 0, resolved: 0 };
    }
    if (existing && existing.status !== "resolved") {
      await this.db
        .update(exceptions)
        .set({
          status: "resolved",
          resolvedAt: new Date(),
          resolvedBy: SYSTEM,
          summary: input.summary,
        })
        .where(eq(exceptions.id, existing.id));
      return { opened: 0, resolved: 1 };
    }
    return { opened: 0, resolved: 0 };
  }

  private async findExisting(type: ExceptionType, lineId: string, commitId: string | null) {
    if (commitId) {
      const [row] = await this.db
        .select()
        .from(exceptions)
        .where(
          and(
            eq(exceptions.exceptionType, type),
            eq(exceptions.forecastLineId, lineId),
            eq(exceptions.commitId, commitId),
          ),
        );
      return row ?? null;
    }
    const [row] = await this.db
      .select()
      .from(exceptions)
      .where(
        and(
          eq(exceptions.exceptionType, type),
          eq(exceptions.forecastLineId, lineId),
          isNull(exceptions.commitId),
        ),
      );
    return row ?? null;
  }

  private async serialize(row: ExceptionRow) {
    const [line] = await this.db
      .select()
      .from(forecastLines)
      .where(eq(forecastLines.id, row.forecastLineId));
    const commits = line
      ? this.pickCurrent(
          await this.db
            .select()
            .from(forecastCommits)
            .where(eq(forecastCommits.parentForecastLineId, line.id)),
        )
      : [];
    const active = commits.filter(
      (c) => ACTIVE.includes(c.status as (typeof ACTIVE)[number]) && Number(c.committedQty) > 0,
    );
    const committedQty = active.reduce((sum, c) => sum + Number(c.committedQty), 0);
    const pos = line
      ? await this.db
          .select()
          .from(purchaseOrders)
          .where(
            inArray(
              purchaseOrders.sourceCommitId,
              commits.map((c) => c.commitId).concat("__none__"),
            ),
          )
      : [];
    const poIds = pos.map((p) => p.id);
    const acks = poIds.length
      ? await this.db
          .select()
          .from(poAcknowledgements)
          .where(inArray(poAcknowledgements.purchaseOrderId, poIds))
      : [];
    const ships = poIds.length
      ? await this.db
          .select()
          .from(executionEvents)
          .where(inArray(executionEvents.purchaseOrderId, poIds))
      : [];
    const otif = poIds.length
      ? await this.db.select().from(otifMetrics).where(inArray(otifMetrics.purchaseOrderId, poIds))
      : [];
    const cos = poIds.length
      ? await this.db
          .select()
          .from(changeOrders)
          .where(inArray(changeOrders.purchaseOrderId, poIds))
      : [];

    return {
      id: row.id,
      exceptionType: row.exceptionType,
      status: row.status,
      forecastId: row.forecastId,
      forecastVersion: row.forecastVersion,
      forecastLineId: row.forecastLineId,
      commitId: row.commitId,
      slaBusinessDays: row.slaBusinessDays,
      dueAt: toIso(row.dueAt),
      openedAt: toIso(row.openedAt),
      acknowledgedAt: toIso(row.acknowledgedAt),
      acknowledgedBy: row.acknowledgedBy,
      resolvedAt: toIso(row.resolvedAt),
      reasonCode: row.reasonCode,
      summary: row.summary,
      payload: row.payload,
      collaboration: {
        requested: line
          ? {
              forecastId: line.forecastId,
              version: line.version,
              requestedQty: line.requestedQty,
              requestedDate: line.requestedDate,
              demandType: line.demandType,
              uom: line.uom,
              needByConvention: line.needByConvention,
              publishedAt: toIso(line.publishedAt),
            }
          : null,
        commits: commits.map((c) => ({
          commitId: c.commitId,
          version: c.version,
          committedQty: c.committedQty,
          committedDate: c.committedDate,
          commitGrade: c.commitGrade,
          status: c.status,
          reasonCode: c.reasonCode,
        })),
        gapQty: line ? (Number(line.requestedQty) - committedQty).toFixed(4) : null,
        purchaseOrders: pos.map((p) => {
          const latestAck = acks
            .filter((a) => a.purchaseOrderId === p.id)
            .sort((a, b) => {
              const at = a.acknowledgedAt instanceof Date ? a.acknowledgedAt : new Date(a.acknowledgedAt);
              const bt = b.acknowledgedAt instanceof Date ? b.acknowledgedAt : new Date(b.acknowledgedAt);
              return bt.getTime() - at.getTime();
            })[0];
          const metric = otif.find((o) => o.purchaseOrderId === p.id);
          return {
            id: p.id,
            poNumber: p.poNumber,
            line: p.line,
            scheduleLine: p.scheduleLine,
            sourceCommitId: p.sourceCommitId,
            firmQty: p.firmQty,
            firmDate: p.firmDate,
            ackStatus: latestAck?.ackStatus ?? null,
            promiseDate: latestAck?.promiseDate ?? null,
            promiseQty: latestAck?.promiseQty ?? null,
            otif: metric?.otif ?? null,
            receivedQty: metric?.receivedQty ?? null,
            receiptDate: metric?.receiptDate ?? null,
          };
        }),
        changeOrders: cos.map((c) => ({
          changeOrderId: c.changeOrderId,
          version: c.version,
          status: c.status,
          reasonCode: c.reasonCode,
          proposedQty: c.proposedQty,
          proposedDate: c.proposedDate,
        })),
        shipments: ships
          .filter((s) => s.eventType === "asn" || s.eventType === "receipt")
          .map((s) => ({
            eventType: s.eventType,
            externalId: s.externalId,
            qty: s.qty,
            occurredAt: toIso(s.occurredAt),
          })),
      },
    };
  }

  private pickCurrent(rows: CommitRow[]) {
    const latest = new Map<string, CommitRow>();
    for (const row of rows) {
      const cur = latest.get(row.commitId);
      if (!cur || row.version > cur.version) latest.set(row.commitId, row);
    }
    return [...latest.values()].filter((r) => r.status !== "superseded");
  }
}
