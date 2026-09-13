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
  contractRefs,
  domainEvents,
  executionEvents,
  forecastCommits,
  forecastLines,
  otifMetrics,
  poAcknowledgements,
  purchaseOrders,
} from "@scp/db";
import type {
  AcknowledgePoInput,
  ConvertCommitInput,
  RecordExecutionInput,
} from "@scp/domain";
import { DOMAIN_EVENTS } from "@scp/event-contracts";
import { desc, eq } from "drizzle-orm";
import { toIso } from "../../common/dates";
import { DbService } from "../../db/db.service";
import type { SessionClaims } from "../auth/token";
import { WritebackService } from "../erp-writeback/erp-writeback.service";

type CommitRow = typeof forecastCommits.$inferSelect;
type LineRow = typeof forecastLines.$inferSelect;
type PoRow = typeof purchaseOrders.$inferSelect;

@Injectable()
export class PurchaseOrderService {
  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(WritebackService) private readonly writebacks: WritebackService,
  ) {}

  private get db() {
    return this.dbService.db;
  }

  async list() {
    const rows = await this.db.select().from(purchaseOrders);
    const result = [];
    for (const row of rows) {
      result.push(await this.serialize(row));
    }
    return result.sort((a, b) => a.poNumber.localeCompare(b.poNumber));
  }

  async get(id: string) {
    const [row] = await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    if (!row) throw new NotFoundException("Purchase order not found");
    return this.serialize(row);
  }

  async convert(commitId: string, input: ConvertCommitInput, user: SessionClaims) {
    if (!user) throw new ForbiddenException("Sign in required");
    const latest = await this.latestCommit(commitId);
    if (!latest) throw new NotFoundException(`Commit ${commitId} not found`);
    if (latest.status !== "accepted") {
      throw new ConflictException(`${commitId} must be accepted before it can become a PO`);
    }
    if (latest.commitGrade !== "firming" && latest.commitGrade !== "frozen") {
      throw new ConflictException(
        "Planning-grade commits are not binding and cannot be converted to a PO",
      );
    }
    if (!latest.committedDate || Number(latest.committedQty) <= 0) {
      throw new BadRequestException("A binding convert needs a positive qty and a firm date");
    }

    const [existing] = await this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.sourceCommitId, latest.commitId));
    if (existing) {
      throw new ConflictException(
        `${latest.commitId} is already schedule ${existing.poNumber}/${existing.line}/${existing.scheduleLine}`,
      );
    }

    const [line] = await this.db
      .select()
      .from(forecastLines)
      .where(eq(forecastLines.id, latest.parentForecastLineId));
    if (!line) throw new NotFoundException("Parent forecast line missing");
    this.assertBuyer(user, line);

    if (line.demandType === "upside") {
      // Explicit convert is the allocation decision — never implicit from a planning accept.
    }

    const poNumber = (input.poNumber ?? `PO-${line.forecastId.replace(/^FC-/, "")}`).toUpperCase();
    const siblings = (await this.db.select().from(purchaseOrders)).filter(
      (p) => p.poNumber === poNumber,
    );
    const lineNo = String((siblings.length + 1) * 10);
    const [cra] = await this.db
      .select()
      .from(contractRefs)
      .where(eq(contractRefs.tradingPartnerSetupId, line.tradingPartnerSetupId));

    const [row] = await this.db
      .insert(purchaseOrders)
      .values({
        poNumber,
        line: lineNo,
        scheduleLine: "1",
        sourceCommitId: latest.commitId,
        sourceCommitVersion: latest.version,
        firmQty: latest.committedQty,
        firmDate: latest.committedDate,
        price: input.price ?? null,
        contractRefId: cra?.id ?? null,
        buyerId: line.buyerId,
        supplierId: line.supplierId,
        partId: line.partId,
        createdBy: user.sub,
      })
      .returning();

    await this.db.insert(domainEvents).values({
      eventName: DOMAIN_EVENTS.PoConverted,
      aggregateType: "purchase_order",
      aggregateId: row!.id,
      aggregateVersion: "1",
      actorId: user.sub,
      payload: {
        poNumber,
        line: lineNo,
        scheduleLine: "1",
        sourceCommitId: latest.commitId,
        sourceCommitVersion: latest.version,
        firmQty: latest.committedQty,
        firmDate: latest.committedDate,
      },
    });
    await this.db.insert(auditEvents).values({
      actorId: user.sub,
      entityType: "purchase_order",
      entityId: `${poNumber}:${lineNo}:1`,
      action: "convert",
      reasonCode: null,
      payload: { sourceCommitId: latest.commitId, forecastId: line.forecastId },
    });
    await this.writebacks.enqueue({
      eventName: DOMAIN_EVENTS.PoConverted,
      entityType: "purchase_order",
      entityId: row!.id,
      actorId: user.sub,
      payload: { poNumber, sourceCommitId: latest.commitId },
    });
    return this.serialize(row!);
  }

  async acknowledge(id: string, input: AcknowledgePoInput, user: SessionClaims) {
    if (!user) throw new ForbiddenException("Sign in required");
    const [po] = await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    if (!po) throw new NotFoundException("Purchase order not found");
    this.assertSupplier(user, po);

    const [ack] = await this.db
      .insert(poAcknowledgements)
      .values({
        purchaseOrderId: po.id,
        ackStatus: input.ackStatus,
        promiseQty: input.promiseQty,
        promiseDate: input.promiseDate,
        changeReason: input.changeReason ?? null,
        acknowledgedBy: user.sub,
      })
      .returning();

    await this.db.insert(domainEvents).values({
      eventName: DOMAIN_EVENTS.PoAcknowledged,
      aggregateType: "purchase_order",
      aggregateId: po.id,
      aggregateVersion: ack!.id,
      actorId: user.sub,
      payload: {
        ackStatus: input.ackStatus,
        promiseQty: input.promiseQty,
        promiseDate: input.promiseDate,
        changeReason: input.changeReason ?? null,
      },
    });
    await this.db.insert(auditEvents).values({
      actorId: user.sub,
      entityType: "po_acknowledgement",
      entityId: ack!.id,
      action: input.ackStatus,
      reasonCode: input.changeReason ?? null,
      payload: { purchaseOrderId: po.id, promiseDate: input.promiseDate },
    });
    await this.writebacks.enqueue({
      eventName: DOMAIN_EVENTS.PoAcknowledged,
      entityType: "purchase_order",
      entityId: po.id,
      actorId: user.sub,
      payload: { ackId: ack!.id, ackStatus: input.ackStatus },
    });
    return this.serialize(po);
  }

  async recordExecution(id: string, input: RecordExecutionInput, user: SessionClaims) {
    if (!user) throw new ForbiddenException("Sign in required");
    const [po] = await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    if (!po) throw new NotFoundException("Purchase order not found");
    this.assertBuyer(user, po);
    if (input.eventType === "invoice") {
      throw new BadRequestException(
        "Invoices stay in ERP. Record an ASN or receipt reference only.",
      );
    }

    const [row] = await this.db
      .insert(executionEvents)
      .values({
        purchaseOrderId: po.id,
        eventType: input.eventType,
        externalId: input.externalId,
        qty: input.qty ?? null,
        occurredAt: new Date(input.occurredAt),
      })
      .returning();
    await this.db.insert(auditEvents).values({
      actorId: user.sub,
      entityType: "execution_event",
      entityId: row!.id,
      action: input.eventType,
      reasonCode: null,
      payload: { purchaseOrderId: po.id, externalId: input.externalId, qty: input.qty ?? null },
    });
    return this.serialize(po);
  }

  private async serialize(po: PoRow) {
    const acks = await this.db
      .select()
      .from(poAcknowledgements)
      .where(eq(poAcknowledgements.purchaseOrderId, po.id))
      .orderBy(desc(poAcknowledgements.acknowledgedAt));
    const latestAck = acks[0] ?? null;
    const events = await this.db
      .select()
      .from(executionEvents)
      .where(eq(executionEvents.purchaseOrderId, po.id));
    const [metric] = await this.db
      .select()
      .from(otifMetrics)
      .where(eq(otifMetrics.purchaseOrderId, po.id));
    const [commit] = await this.db
      .select()
      .from(forecastCommits)
      .where(eq(forecastCommits.commitId, po.sourceCommitId))
      .orderBy(desc(forecastCommits.version))
      .limit(1);
    const [line] = commit
      ? await this.db
          .select()
          .from(forecastLines)
          .where(eq(forecastLines.id, commit.parentForecastLineId))
      : [];

    return {
      id: po.id,
      poNumber: po.poNumber,
      line: po.line,
      scheduleLine: po.scheduleLine,
      sourceCommitId: po.sourceCommitId,
      sourceCommitVersion: po.sourceCommitVersion,
      firmQty: po.firmQty,
      firmDate: po.firmDate,
      price: po.price,
      contractRefId: po.contractRefId,
      buyerId: po.buyerId,
      supplierId: po.supplierId,
      partId: po.partId,
      createdAt: toIso(po.createdAt),
      createdBy: po.createdBy,
      forecastId: line?.forecastId ?? null,
      binding: true,
      latestAck: latestAck
        ? {
            id: latestAck.id,
            ackStatus: latestAck.ackStatus,
            promiseQty: latestAck.promiseQty,
            promiseDate: latestAck.promiseDate,
            changeReason: latestAck.changeReason,
            acknowledgedBy: latestAck.acknowledgedBy,
            acknowledgedAt: toIso(latestAck.acknowledgedAt),
          }
        : null,
      acknowledgements: acks.map((a) => ({
        id: a.id,
        ackStatus: a.ackStatus,
        promiseQty: a.promiseQty,
        promiseDate: a.promiseDate,
        changeReason: a.changeReason,
        acknowledgedBy: a.acknowledgedBy,
        acknowledgedAt: toIso(a.acknowledgedAt),
      })),
      execution: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        externalId: e.externalId,
        qty: e.qty,
        occurredAt: toIso(e.occurredAt),
      })),
      otif: metric
        ? {
            promiseDate: metric.promiseDate,
            promiseQty: metric.promiseQty,
            receiptDate: metric.receiptDate,
            receivedQty: metric.receivedQty,
            otif: metric.otif,
          }
        : null,
    };
  }

  private async latestCommit(commitId: string) {
    const [row] = await this.db
      .select()
      .from(forecastCommits)
      .where(eq(forecastCommits.commitId, commitId.toUpperCase()))
      .orderBy(desc(forecastCommits.version))
      .limit(1);
    return row ?? null;
  }

  private assertBuyer(user: SessionClaims, row: LineRow | PoRow) {
    if (user.partyType !== "buyer" || user.partnerId !== row.buyerId) {
      throw new ForbiddenException("Only the buying partner can convert a commit or record receipts");
    }
  }

  private assertSupplier(user: SessionClaims, po: PoRow) {
    if (user.partyType !== "supplier" || user.partnerId !== po.supplierId) {
      throw new ForbiddenException("Only the supplying partner can acknowledge a PO");
    }
  }
}
