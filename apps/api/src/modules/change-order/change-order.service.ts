import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  auditEvents,
  changeOrders,
  domainEvents,
  forecastCommits,
  forecastLines,
  poAcknowledgements,
  purchaseOrders,
  tradingPartnerSetups,
} from "@scp/db";
import type { DecideChangeOrderInput, ProposeChangeOrderInput } from "@scp/domain";
import { DOMAIN_EVENTS } from "@scp/event-contracts";
import { desc, eq } from "drizzle-orm";
import { toIso } from "../../common/dates";
import { DbService } from "../../db/db.service";
import type { SessionClaims } from "../auth/token";
import { WritebackService } from "../erp-writeback/erp-writeback.service";

type PoRow = typeof purchaseOrders.$inferSelect;
type CoRow = typeof changeOrders.$inferSelect;

@Injectable()
export class ChangeOrderService {
  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(WritebackService) private readonly writebacks: WritebackService,
  ) {}

  private get db() {
    return this.dbService.db;
  }

  async list() {
    const rows = await this.db.select().from(changeOrders);
    const current = this.pickCurrent(rows);
    return Promise.all(current.map((row) => this.serialize(row)));
  }

  async get(changeOrderId: string) {
    const latest = await this.latest(changeOrderId);
    if (!latest) throw new NotFoundException(`Change order ${changeOrderId} not found`);
    return this.serialize(latest);
  }

  async propose(purchaseOrderId: string, input: ProposeChangeOrderInput, user: SessionClaims) {
    if (!user) throw new ForbiddenException("Sign in required");
    const [po] = await this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, purchaseOrderId));
    if (!po) throw new NotFoundException("Purchase order not found");
    this.assertParty(user, po);

    if (!input.reasonCode) {
      throw new BadRequestException("A change order always requires a reason_code");
    }

    const tpa = await this.tpaForPo(po);
    const insideFirm = tpa ? this.insideFirmFence(tpa.firmFenceWeeks, po.firmDate) : false;
    if (insideFirm && !input.reasonCode) {
      throw new BadRequestException("Inside the firm fence a change order requires a reason_code");
    }

    const changeOrderId = await this.allocateId();
    const now = new Date();
    const [row] = await this.db
      .insert(changeOrders)
      .values({
        changeOrderId,
        version: 1,
        purchaseOrderId: po.id,
        proposedQty: input.proposedQty ?? null,
        proposedDate: input.proposedDate ?? null,
        reasonCode: input.reasonCode,
        status: "proposed",
        initiatedByParty: user.partyType,
        initiatedBy: user.sub,
        buyerAcceptedAt: user.partyType === "buyer" ? now : null,
        supplierAcceptedAt: user.partyType === "supplier" ? now : null,
        msaClauseRef: input.msaClauseRef ?? null,
      })
      .returning();

    await this.db.insert(domainEvents).values({
      eventName: DOMAIN_EVENTS.ChangeOrderProposed,
      aggregateType: "change_order",
      aggregateId: changeOrderId,
      aggregateVersion: "1",
      actorId: user.sub,
      payload: {
        purchaseOrderId: po.id,
        reasonCode: input.reasonCode,
        proposedQty: input.proposedQty ?? null,
        proposedDate: input.proposedDate ?? null,
        insideFirmFence: insideFirm,
      },
    });
    await this.db.insert(auditEvents).values({
      actorId: user.sub,
      entityType: "change_order",
      entityId: `${changeOrderId}:v1`,
      action: "propose",
      reasonCode: input.reasonCode,
      payload: { purchaseOrderId: po.id, insideFirmFence: insideFirm },
    });
    return this.serialize(row!);
  }

  async decide(changeOrderId: string, input: DecideChangeOrderInput, user: SessionClaims) {
    if (!user) throw new ForbiddenException("Sign in required");
    const latest = await this.latest(changeOrderId);
    if (!latest) throw new NotFoundException(`Change order ${changeOrderId} not found`);
    if (latest.status !== "proposed") {
      throw new ConflictException(`${changeOrderId} is ${latest.status}`);
    }
    const [po] = await this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, latest.purchaseOrderId));
    if (!po) throw new NotFoundException("Purchase order not found");
    this.assertParty(user, po);

    if (input.decision === "rejected") {
      const [updated] = await this.db
        .update(changeOrders)
        .set({ status: "rejected" })
        .where(eq(changeOrders.id, latest.id))
        .returning();
      await this.auditDecision(user.sub, latest, "rejected");
      return this.serialize(updated!);
    }

    const now = new Date();
    const buyerAcceptedAt = latest.buyerAcceptedAt ?? (user.partyType === "buyer" ? now : null);
    const supplierAcceptedAt =
      latest.supplierAcceptedAt ?? (user.partyType === "supplier" ? now : null);
    const both = Boolean(buyerAcceptedAt) && Boolean(supplierAcceptedAt);

    if (both) {
      await this.db
        .update(changeOrders)
        .set({ status: "superseded" })
        .where(eq(changeOrders.id, latest.id));
      const [accepted] = await this.db
        .insert(changeOrders)
        .values({
          changeOrderId: latest.changeOrderId,
          version: latest.version + 1,
          purchaseOrderId: latest.purchaseOrderId,
          proposedQty: latest.proposedQty,
          proposedDate: latest.proposedDate,
          reasonCode: latest.reasonCode,
          status: "accepted",
          initiatedByParty: latest.initiatedByParty,
          initiatedBy: latest.initiatedBy,
          buyerAcceptedAt,
          supplierAcceptedAt,
          msaClauseRef: latest.msaClauseRef,
        })
        .returning();

      const promiseQty = accepted!.proposedQty ?? po.firmQty;
      const promiseDate = accepted!.proposedDate ?? po.firmDate;
      await this.db.insert(poAcknowledgements).values({
        purchaseOrderId: po.id,
        ackStatus: "date_change",
        promiseQty,
        promiseDate,
        changeReason: latest.reasonCode,
        acknowledgedBy: user.sub,
      });
      await this.db.insert(domainEvents).values({
        eventName: DOMAIN_EVENTS.ChangeOrderAccepted,
        aggregateType: "change_order",
        aggregateId: latest.changeOrderId,
        aggregateVersion: String(latest.version + 1),
        actorId: user.sub,
        payload: {
          purchaseOrderId: po.id,
          reasonCode: latest.reasonCode,
          promiseQty,
          promiseDate,
        },
      });
      await this.auditDecision(user.sub, accepted!, "accepted");
      await this.writebacks.enqueue({
        eventName: DOMAIN_EVENTS.ChangeOrderAccepted,
        entityType: "change_order",
        entityId: latest.changeOrderId,
        actorId: user.sub,
        payload: { purchaseOrderId: po.id, promiseDate },
      });
      return this.serialize(accepted!);
    }

    const [updated] = await this.db
      .update(changeOrders)
      .set({ buyerAcceptedAt, supplierAcceptedAt })
      .where(eq(changeOrders.id, latest.id))
      .returning();
    await this.auditDecision(user.sub, updated!, "partial_accept");
    return this.serialize(updated!);
  }

  private async serialize(row: CoRow) {
    const [po] = await this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, row.purchaseOrderId));
    const history = await this.db
      .select()
      .from(changeOrders)
      .where(eq(changeOrders.changeOrderId, row.changeOrderId));
    return {
      id: row.id,
      changeOrderId: row.changeOrderId,
      version: row.version,
      purchaseOrderId: row.purchaseOrderId,
      poNumber: po?.poNumber ?? null,
      proposedQty: row.proposedQty,
      proposedDate: row.proposedDate,
      reasonCode: row.reasonCode,
      status: row.status,
      initiatedByParty: row.initiatedByParty,
      initiatedBy: row.initiatedBy,
      buyerAcceptedAt: toIso(row.buyerAcceptedAt),
      supplierAcceptedAt: toIso(row.supplierAcceptedAt),
      msaClauseRef: row.msaClauseRef,
      createdAt: toIso(row.createdAt),
      history: history.map((h) => ({
        version: h.version,
        status: h.status,
        reasonCode: h.reasonCode,
      })),
    };
  }

  private async latest(changeOrderId: string) {
    const [row] = await this.db
      .select()
      .from(changeOrders)
      .where(eq(changeOrders.changeOrderId, changeOrderId.toUpperCase()))
      .orderBy(desc(changeOrders.version))
      .limit(1);
    return row ?? null;
  }

  private pickCurrent(rows: CoRow[]) {
    const latest = new Map<string, CoRow>();
    for (const row of rows) {
      const cur = latest.get(row.changeOrderId);
      if (!cur || row.version > cur.version) latest.set(row.changeOrderId, row);
    }
    return [...latest.values()];
  }

  private assertParty(user: SessionClaims, po: PoRow) {
    const allowed =
      (user.partyType === "buyer" && user.partnerId === po.buyerId) ||
      (user.partyType === "supplier" && user.partnerId === po.supplierId);
    if (!allowed) throw new ForbiddenException("Only the PO's buyer or supplier can act");
  }

  private async tpaForPo(po: PoRow) {
    const [commit] = await this.db
      .select()
      .from(forecastCommits)
      .where(eq(forecastCommits.commitId, po.sourceCommitId))
      .orderBy(desc(forecastCommits.version))
      .limit(1);
    if (!commit) return null;
    const [line] = await this.db
      .select()
      .from(forecastLines)
      .where(eq(forecastLines.id, commit.parentForecastLineId));
    if (!line) return null;
    const [tpa] = await this.db
      .select()
      .from(tradingPartnerSetups)
      .where(eq(tradingPartnerSetups.id, line.tradingPartnerSetupId));
    return tpa ?? null;
  }

  private insideFirmFence(firmFenceWeeks: number, firmDate: string) {
    const ms = Date.parse(`${firmDate}T00:00:00Z`) - Date.now();
    return ms / 86_400_000 / 7 < firmFenceWeeks;
  }

  private async auditDecision(actorId: string, row: CoRow, action: string) {
    await this.db.insert(auditEvents).values({
      actorId,
      entityType: "change_order",
      entityId: `${row.changeOrderId}:v${row.version}`,
      action,
      reasonCode: row.reasonCode,
      payload: { status: row.status },
    });
  }

  private async allocateId() {
    for (let i = 0; i < 12; i++) {
      const candidate = `CO-${String(Math.floor(10000 + Math.random() * 90000))}`;
      const [existing] = await this.db
        .select()
        .from(changeOrders)
        .where(eq(changeOrders.changeOrderId, candidate))
        .limit(1);
      if (!existing) return candidate;
    }
    throw new ConflictException("Could not allocate a change-order id");
  }
}
