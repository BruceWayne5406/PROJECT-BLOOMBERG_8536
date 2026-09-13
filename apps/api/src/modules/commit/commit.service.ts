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
  domainEvents,
  flexibilityBands,
  forecastCommits,
  forecastLines,
  tradingPartnerSetups,
  type Database,
} from "@scp/db";
import type {
  CommitSplitInput,
  DecideCommitInput,
  OfferSplitsInput,
  SupersedeCommitInput,
} from "@scp/domain";
import type { CommitGrade, ReasonCode } from "@scp/domain";
import { DOMAIN_EVENTS } from "@scp/event-contracts";
import { desc, eq } from "drizzle-orm";
import { DbService } from "../../db/db.service";
import type { SessionClaims } from "../auth/token";
import { toIso } from "../../common/dates";

type CommitRow = typeof forecastCommits.$inferSelect;
type ForecastRow = typeof forecastLines.$inferSelect;
type TpaRow = typeof tradingPartnerSetups.$inferSelect;
type Tx = Pick<Database, "select" | "insert" | "update">;

const ACTIVE = ["offered", "accepted"] as const;

@Injectable()
export class CommitService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db;
  }

  async inbox() {
    const published = (await this.db.select().from(forecastLines)).filter(
      (l) => l.status === "published",
    );
    const results = [];
    for (const line of published) {
      results.push(await this.bundle(line));
    }
    return results.sort((a, b) => a.forecastId.localeCompare(b.forecastId));
  }

  async forForecast(forecastId: string) {
    const line = await this.publishedLine(forecastId);
    return this.bundle(line);
  }

  async offer(forecastId: string, input: OfferSplitsInput, user: SessionClaims) {
    if (!user) throw new ForbiddenException("Sign in required");
    const line = await this.publishedLine(forecastId);
    this.assertSupplier(user, line);
    const tpa = await this.tpa(line.tradingPartnerSetupId);
    const bands = await this.bands(tpa.id);

    await this.db.transaction(async (tx) => {
      const existing = await this.currentInTx(tx, line.id);
      const accepted = existing.filter((c) => c.status === "accepted" && Number(c.committedQty) > 0);
      const replaceable = existing.filter((c) => c.status === "offered");

      for (const row of replaceable) {
        await tx
          .update(forecastCommits)
          .set({ status: "superseded" })
          .where(eq(forecastCommits.id, row.id));
        await tx.insert(domainEvents).values({
          eventName: DOMAIN_EVENTS.CommitSuperseded,
          aggregateType: "forecast_commit",
          aggregateId: row.commitId,
          aggregateVersion: String(row.version),
          actorId: user.sub,
          payload: { commitId: row.commitId, version: row.version, replacedByOffer: true },
        });
      }

      const now = new Date();
      const inserted: CommitRow[] = [];
      for (const split of input.splits) {
        const commitId = split.commitId
          ? await this.assertNewOrReusableId(tx, split.commitId.toUpperCase(), replaceable)
          : await this.allocateCommitId(tx);
        const prior = replaceable.find((c) => c.commitId === commitId);
        const version = prior ? prior.version + 1 : 1;
        const qty = split.committedQty;
        const date = split.committedDate ?? null;
        const grade =
          split.commitGrade ??
          (Number(qty) > 0 ? this.suggestGrade(bands, date ?? line.requestedDate) : null);

        const [row] = await tx
          .insert(forecastCommits)
          .values({
            commitId,
            parentForecastId: line.forecastId,
            parentForecastLineId: line.id,
            version,
            committedQty: qty,
            committedDate: date,
            commitGrade: grade,
            uncommittedQty: "0",
            reasonCode: split.reasonCode ?? null,
            comment: split.comment ?? null,
            committedBy: user.sub,
            committedAt: now,
            status: "offered",
          })
          .returning();
        inserted.push(row!);
        await this.recordOffer(tx, row!, user.sub);
      }

      const remaining = this.remainingQty(line, [...accepted, ...inserted]);
      await this.stampUncommitted(tx, inserted, remaining);
    });

    return this.bundle(line);
  }

  async supersede(commitId: string, input: SupersedeCommitInput, user: SessionClaims) {
    if (!user) throw new ForbiddenException("Sign in required");
    const latest = await this.latestCommit(commitId);
    if (!latest) throw new NotFoundException(`Commit ${commitId} not found`);
    if (latest.status === "superseded" || latest.status === "rejected") {
      throw new ConflictException(`${commitId} is ${latest.status} and cannot be superseded`);
    }

    const [line] = await this.db
      .select()
      .from(forecastLines)
      .where(eq(forecastLines.id, latest.parentForecastLineId));
    if (!line) throw new NotFoundException("Parent forecast line missing");
    this.assertSupplier(user, line);

    const tpa = await this.tpa(line.tradingPartnerSetupId);
    const insideFirm = this.insideFirmFence(tpa, line.requestedDate);
    if (insideFirm && !input.reasonCode) {
      throw new BadRequestException(
        "Inside the firm fence a supersede is a de-commit and requires a reason_code",
      );
    }

    const bands = await this.bands(tpa.id);
    const grade =
      input.commitGrade ??
      (Number(input.committedQty) > 0
        ? this.suggestGrade(bands, input.committedDate ?? line.requestedDate)
        : null);

    return this.db.transaction(async (tx) => {
      await tx
        .update(forecastCommits)
        .set({ status: "superseded" })
        .where(eq(forecastCommits.id, latest.id));

      const now = new Date();
      const [row] = await tx
        .insert(forecastCommits)
        .values({
          commitId: latest.commitId,
          parentForecastId: latest.parentForecastId,
          parentForecastLineId: latest.parentForecastLineId,
          version: latest.version + 1,
          committedQty: input.committedQty,
          committedDate: input.committedDate ?? null,
          commitGrade: grade,
          uncommittedQty: "0",
          reasonCode: input.reasonCode ?? null,
          comment: input.comment ?? null,
          committedBy: user.sub,
          committedAt: now,
          status: "offered",
        })
        .returning();

      await tx.insert(domainEvents).values({
        eventName: insideFirm ? DOMAIN_EVENTS.DecommitFiled : DOMAIN_EVENTS.CommitSuperseded,
        aggregateType: "forecast_commit",
        aggregateId: latest.commitId,
        aggregateVersion: String(latest.version),
        actorId: user.sub,
        payload: {
          commitId: latest.commitId,
          fromVersion: latest.version,
          toVersion: latest.version + 1,
          reasonCode: input.reasonCode ?? null,
        },
      });
      await this.recordOffer(tx, row!, user.sub, insideFirm ? "decommit" : "supersede");

      const current = await this.currentInTx(tx, line.id);
      const remaining = this.remainingQty(line, current);
      await this.stampUncommitted(
        tx,
        current.filter((c) => c.status === "offered"),
        remaining,
      );

      return this.serialize(row!, line);
    });
  }

  async decide(commitId: string, input: DecideCommitInput, user: SessionClaims) {
    if (!user) throw new ForbiddenException("Sign in required");
    const latest = await this.latestCommit(commitId);
    if (!latest) throw new NotFoundException(`Commit ${commitId} not found`);
    if (latest.status !== "offered") {
      throw new ConflictException(`${commitId} is ${latest.status}, not offered`);
    }
    const [line] = await this.db
      .select()
      .from(forecastLines)
      .where(eq(forecastLines.id, latest.parentForecastLineId));
    if (!line) throw new NotFoundException("Parent forecast line missing");
    this.assertBuyer(user, line);

    if (input.decision === "accepted" && line.demandType === "upside") {
      // Explicit decision is required — accepting upside is allowed, but never implicit.
    }

    const [updated] = await this.db
      .update(forecastCommits)
      .set({ status: input.decision })
      .where(eq(forecastCommits.id, latest.id))
      .returning();

    await this.db.insert(domainEvents).values({
      eventName:
        input.decision === "accepted"
          ? DOMAIN_EVENTS.CommitAccepted
          : DOMAIN_EVENTS.CommitRejected,
      aggregateType: "forecast_commit",
      aggregateId: latest.commitId,
      aggregateVersion: String(latest.version),
      actorId: user.sub,
      payload: {
        commitId: latest.commitId,
        decision: input.decision,
        commitGrade: latest.commitGrade,
        demandType: line.demandType,
      },
    });
    await this.db.insert(auditEvents).values({
      actorId: user.sub,
      entityType: "forecast_commit",
      entityId: `${latest.commitId}:v${latest.version}`,
      action: input.decision,
      reasonCode: null,
      payload: { commitId: latest.commitId, decision: input.decision },
    });

    return this.serialize(updated!, line);
  }

  private async bundle(line: ForecastRow) {
    const all = await this.db
      .select()
      .from(forecastCommits)
      .where(eq(forecastCommits.parentForecastId, line.forecastId))
      .orderBy(forecastCommits.commitId, forecastCommits.version);
    const siblings = await this.db
      .select()
      .from(forecastLines)
      .where(eq(forecastLines.forecastId, line.forecastId));
    const byLine = new Map(siblings.map((l) => [l.id, l]));
    const onThisLine = all.filter((c) => c.parentForecastLineId === line.id);
    const current = this.pickCurrent(onThisLine);
    const metrics = this.metrics(line, current);

    let priorResponse: {
      forecastVersion: number;
      requestedQty: string;
      requestedDate: string;
      metrics: ReturnType<CommitService["metrics"]>;
      splits: ReturnType<CommitService["serialize"]>[];
    } | null = null;

    if (current.length === 0 && all.length > 0) {
      const versioned = siblings
        .filter((l) => l.id !== line.id)
        .sort((a, b) => b.version - a.version);
      for (const older of versioned) {
        const olderCurrent = this.pickCurrent(
          all.filter((c) => c.parentForecastLineId === older.id),
        );
        if (olderCurrent.length === 0) continue;
        priorResponse = {
          forecastVersion: older.version,
          requestedQty: older.requestedQty,
          requestedDate: older.requestedDate,
          metrics: this.metrics(older, olderCurrent),
          splits: olderCurrent.map((c) => this.serialize(c, older)),
        };
        break;
      }
    }

    return {
      forecastId: line.forecastId,
      forecastVersion: line.version,
      forecastLineId: line.id,
      forecastStatus: line.status,
      requestedQty: line.requestedQty,
      requestedDate: line.requestedDate,
      demandType: line.demandType,
      uom: line.uom,
      needByConvention: line.needByConvention,
      buyerId: line.buyerId,
      supplierId: line.supplierId,
      program: line.program,
      metrics,
      splits: current.map((c) => this.serialize(c, line)),
      history: all.map((c) => this.serialize(c, byLine.get(c.parentForecastLineId) ?? line)),
      priorResponse,
    };
  }

  private serialize(row: CommitRow, line: ForecastRow) {
    const qty = Number(row.committedQty);
    const late =
      Boolean(row.committedDate) &&
      qty > 0 &&
      row.status !== "rejected" &&
      row.status !== "superseded" &&
      row.committedDate! > line.requestedDate;
    return {
      id: row.id,
      commitId: row.commitId,
      version: row.version,
      forecastVersion: line.version,
      parentForecastId: row.parentForecastId,
      parentForecastLineId: row.parentForecastLineId,
      committedQty: row.committedQty,
      committedDate: row.committedDate,
      commitGrade: row.commitGrade,
      uncommittedQty: row.uncommittedQty,
      reasonCode: row.reasonCode,
      comment: row.comment,
      committedBy: row.committedBy,
      committedAt: toIso(row.committedAt),
      status: row.status,
      lateFlag: late,
      isRemainder: qty === 0,
      binding: row.status === "accepted" && (row.commitGrade === "firming" || row.commitGrade === "frozen"),
    };
  }

  private metrics(line: ForecastRow, current: CommitRow[]) {
    const active = current.filter(
      (c) => ACTIVE.includes(c.status as (typeof ACTIVE)[number]) && Number(c.committedQty) > 0,
    );
    const committedQty = active.reduce((sum, c) => sum + Number(c.committedQty), 0);
    const lateQty = active
      .filter((c) => c.committedDate && c.committedDate > line.requestedDate)
      .reduce((sum, c) => sum + Number(c.committedQty), 0);
    const requested = Number(line.requestedQty);
    const gapQty = requested - committedQty;
    const gapRow = current.find(
      (c) =>
        ACTIVE.includes(c.status as (typeof ACTIVE)[number]) &&
        Number(c.committedQty) === 0 &&
        c.reasonCode,
    );
    const latestAt = current
      .map((c) => (c.committedAt instanceof Date ? c.committedAt : new Date(c.committedAt)))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return {
      requestedQty: line.requestedQty,
      committedQty: committedQty.toFixed(4),
      gapQty: gapQty.toFixed(4),
      lateQty: lateQty.toFixed(4),
      lateFlag: lateQty > 0,
      gapReasonCode: gapRow?.reasonCode ?? (gapQty > 0 ? null : null),
      splitCount: active.length,
      remainderCount: current.filter((c) => Number(c.committedQty) === 0 && c.status !== "superseded").length,
      commitAgeHours: latestAt
        ? Math.round((Date.now() - latestAt.getTime()) / 3_600_000)
        : null,
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

  private remainingQty(line: ForecastRow, rows: CommitRow[]) {
    const committed = rows
      .filter((c) => ACTIVE.includes(c.status as (typeof ACTIVE)[number]) && Number(c.committedQty) > 0)
      .reduce((sum, c) => sum + Number(c.committedQty), 0);
    return Math.max(0, Number(line.requestedQty) - committed);
  }

  private async stampUncommitted(tx: Tx, rows: CommitRow[], remaining: number) {
    const value = remaining.toFixed(4);
    for (const row of rows) {
      if (row.status !== "offered") continue;
      await tx
        .update(forecastCommits)
        .set({ uncommittedQty: value })
        .where(eq(forecastCommits.id, row.id));
    }
  }

  private async publishedLine(forecastId: string) {
    const [line] = await this.db
      .select()
      .from(forecastLines)
      .where(eq(forecastLines.forecastId, forecastId))
      .orderBy(desc(forecastLines.version));
    if (!line) throw new NotFoundException(`Forecast ${forecastId} not found`);
    const published =
      line.status === "published"
        ? line
        : (
            await this.db
              .select()
              .from(forecastLines)
              .where(eq(forecastLines.forecastId, forecastId))
          ).find((l) => l.status === "published");
    if (!published) {
      throw new ConflictException(`${forecastId} has no published version to commit against`);
    }
    return published;
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

  private async currentInTx(tx: Tx, forecastLineId: string) {
    const rows = await tx
      .select()
      .from(forecastCommits)
      .where(eq(forecastCommits.parentForecastLineId, forecastLineId));
    return this.pickCurrent(rows);
  }

  private async tpa(id: string) {
    const [row] = await this.db
      .select()
      .from(tradingPartnerSetups)
      .where(eq(tradingPartnerSetups.id, id));
    if (!row) throw new BadRequestException("Trading partner setup missing");
    return row;
  }

  private async bands(tpaId: string) {
    return this.db
      .select()
      .from(flexibilityBands)
      .where(eq(flexibilityBands.tradingPartnerSetupId, tpaId));
  }

  private suggestGrade(
    bands: (typeof flexibilityBands.$inferSelect)[],
    needBy: string,
  ): CommitGrade {
    const weeks = this.weeksTo(needBy);
    const match = bands.find((b) => {
      const min = b.weeksToNeedByMin ?? Number.NEGATIVE_INFINITY;
      const max = b.weeksToNeedByMax ?? Number.POSITIVE_INFINITY;
      return weeks >= min && weeks <= max;
    });
    return match?.commitGrade ?? "planning";
  }

  private insideFirmFence(tpa: TpaRow, needBy: string) {
    return this.weeksTo(needBy) < tpa.firmFenceWeeks;
  }

  private weeksTo(isoDate: string) {
    const ms = Date.parse(`${isoDate}T00:00:00Z`) - Date.now();
    return ms / 86_400_000 / 7;
  }

  private assertSupplier(user: SessionClaims, line: ForecastRow) {
    if (user.partyType !== "supplier" || user.partnerId !== line.supplierId) {
      throw new ForbiddenException("Only the forecast's supplier can offer or supersede commits");
    }
  }

  private assertBuyer(user: SessionClaims, line: ForecastRow) {
    if (user.partyType !== "buyer" || user.partnerId !== line.buyerId) {
      throw new ForbiddenException("Only the buying partner can accept or reject a commit");
    }
  }

  private async recordOffer(tx: Tx, row: CommitRow, actorId: string, action = "offer") {
    await tx.insert(domainEvents).values({
      eventName: DOMAIN_EVENTS.CommitOffered,
      aggregateType: "forecast_commit",
      aggregateId: row.commitId,
      aggregateVersion: String(row.version),
      actorId,
      payload: {
        commitId: row.commitId,
        version: row.version,
        parentForecastId: row.parentForecastId,
        committedQty: row.committedQty,
        committedDate: row.committedDate,
        commitGrade: row.commitGrade,
        reasonCode: row.reasonCode,
      },
    });
    await tx.insert(auditEvents).values({
      actorId,
      entityType: "forecast_commit",
      entityId: `${row.commitId}:v${row.version}`,
      action,
      reasonCode: (row.reasonCode as ReasonCode | null) ?? null,
      payload: {
        commitId: row.commitId,
        version: row.version,
        committedQty: row.committedQty,
        committedDate: row.committedDate,
      },
    });
  }

  private async assertNewOrReusableId(tx: Tx, commitId: string, replaceable: CommitRow[]) {
    if (replaceable.some((c) => c.commitId === commitId)) return commitId;
    const [existing] = await tx
      .select()
      .from(forecastCommits)
      .where(eq(forecastCommits.commitId, commitId))
      .limit(1);
    if (existing) {
      throw new ConflictException(
        `${commitId} already exists — supersede it via POST /commits/${commitId}/versions`,
      );
    }
    return commitId;
  }

  private async allocateCommitId(tx: Tx) {
    for (let i = 0; i < 12; i++) {
      const candidate = `CM-${String(Math.floor(10000 + Math.random() * 90000))}`;
      const [existing] = await tx
        .select()
        .from(forecastCommits)
        .where(eq(forecastCommits.commitId, candidate))
        .limit(1);
      if (!existing) return candidate;
    }
    throw new ConflictException("Could not allocate a commit id");
  }
}
