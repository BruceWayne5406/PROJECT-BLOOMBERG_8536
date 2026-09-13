import { Inject, Injectable, Logger } from "@nestjs/common";
import { auditEvents, domainEvents, erpWritebacks } from "@scp/db";
import { DOMAIN_EVENTS } from "@scp/event-contracts";
import { eq } from "drizzle-orm";
import { DbService } from "../../db/db.service";

const SYSTEM = "system.scp";

@Injectable()
export class WritebackService {
  private readonly log = new Logger(WritebackService.name);

  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db;
  }

  async enqueue(input: {
    eventName: string;
    entityType: string;
    entityId: string;
    actorId: string;
    payload: Record<string, unknown>;
  }) {
    const [row] = await this.db
      .insert(erpWritebacks)
      .values({
        eventName: input.eventName,
        entityType: input.entityType,
        entityId: input.entityId,
        status: "pending",
        payload: input.payload,
      })
      .returning();
    await this.db.insert(domainEvents).values({
      eventName: DOMAIN_EVENTS.ErpWritebackRequested,
      aggregateType: input.entityType,
      aggregateId: input.entityId,
      aggregateVersion: "1",
      actorId: input.actorId,
      payload: { writebackId: row!.id, ...input.payload },
    });
    await this.processOne(row!.id);
    return row!;
  }

  async list() {
    return this.db.select().from(erpWritebacks);
  }

  async processPending() {
    const rows = (await this.db.select().from(erpWritebacks)).filter(
      (r) => r.status === "pending" || r.status === "failed",
    );
    let succeeded = 0;
    let failed = 0;
    for (const row of rows) {
      const result = await this.processOne(row.id);
      if (result === "succeeded") succeeded += 1;
      else failed += 1;
    }
    return { processed: rows.length, succeeded, failed };
  }

  async processOne(id: string) {
    const [row] = await this.db.select().from(erpWritebacks).where(eq(erpWritebacks.id, id));
    if (!row || row.status === "succeeded") return row?.status ?? "missing";
    const attempts = row.attempts + 1;
    try {
      // Stub adapter: this platform does not own ERP. We record the payload for IBP/ERP to consume.
      this.log.log(`ERP write-back ${row.eventName} ${row.entityType}:${row.entityId}`);
      await this.db
        .update(erpWritebacks)
        .set({
          status: "succeeded",
          attempts,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(erpWritebacks.id, id));
      await this.db.insert(domainEvents).values({
        eventName: DOMAIN_EVENTS.ErpWritebackSucceeded,
        aggregateType: row.entityType,
        aggregateId: row.entityId,
        aggregateVersion: String(attempts),
        actorId: SYSTEM,
        payload: { writebackId: id, eventName: row.eventName },
      });
      await this.db.insert(auditEvents).values({
        actorId: SYSTEM,
        entityType: "erp_writeback",
        entityId: id,
        action: "succeeded",
        reasonCode: null,
        payload: { eventName: row.eventName, entityId: row.entityId },
      });
      return "succeeded" as const;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.db
        .update(erpWritebacks)
        .set({
          status: "failed",
          attempts,
          lastError: message,
          updatedAt: new Date(),
        })
        .where(eq(erpWritebacks.id, id));
      await this.db.insert(domainEvents).values({
        eventName: DOMAIN_EVENTS.ErpWritebackFailed,
        aggregateType: row.entityType,
        aggregateId: row.entityId,
        aggregateVersion: String(attempts),
        actorId: SYSTEM,
        payload: { writebackId: id, error: message },
      });
      return "failed" as const;
    }
  }
}
