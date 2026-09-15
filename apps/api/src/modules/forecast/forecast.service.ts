import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { assertBuyerSession, assertForecastPublisher } from "./forecast-auth";
import type { SessionClaims } from "../auth/token";
import {
  actors,
  buyers,
  forecastLines,
  parts,
  sites,
  suppliers,
  tradingPartnerSetups,
  auditEvents,
  domainEvents,
} from "@scp/db";
import type { PublishForecastInput, RepublishForecastInput } from "@scp/domain";
import { DOMAIN_EVENTS } from "@scp/event-contracts";
import { desc, eq } from "drizzle-orm";
import { DbService } from "../../db/db.service";
import { toIso, weekStartingMonday } from "../../common/dates";

type LineRow = typeof forecastLines.$inferSelect;

@Injectable()
export class ForecastService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db;
  }

  async list() {
    const rows = await this.hydratedLines();
    const latest = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const current = latest.get(row.forecastId);
      if (!current || row.version > current.version) latest.set(row.forecastId, row);
    }
    return [...latest.values()].sort((a, b) =>
      (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    );
  }

  async get(forecastId: string) {
    const versions = (await this.hydratedLines()).filter((r) => r.forecastId === forecastId);
    if (versions.length === 0) {
      throw new NotFoundException(`Forecast ${forecastId} not found`);
    }
    versions.sort((a, b) => b.version - a.version);
    const current = versions[0]!;
    return {
      current,
      versions: [...versions].sort((a, b) => a.version - b.version),
      diffs: this.diffVersions([...versions].sort((a, b) => a.version - b.version)),
    };
  }

  async publish(input: PublishForecastInput, user: SessionClaims) {
    assertBuyerSession(user);
    await this.assertActor(user.sub);
    const forecastId = input.forecastId
      ? await this.assertNewForecastId(input.forecastId)
      : await this.allocateForecastId();

    return this.db.transaction(async (tx) => {
      const ctx = await this.resolvePublishContext(
        tx,
        input.tradingPartnerSetupId,
        input.partId,
        input.shipToSiteId,
      );
      assertForecastPublisher(user, ctx.tpa.buyerId);
      const now = new Date();
      const asDraft = input.asDraft ?? false;
      const [inserted] = await tx
        .insert(forecastLines)
        .values({
          forecastId,
          version: 1,
          publishedAt: asDraft ? null : now,
          horizonBucket: weekStartingMonday(input.requestedDate),
          requestedQty: input.requestedQty,
          requestedDate: input.requestedDate,
          demandType: input.demandType,
          priority: input.priority ?? 100,
          program: input.program ?? null,
          status: asDraft ? "draft" : "published",
          buyerId: ctx.tpa.buyerId,
          supplierId: ctx.tpa.supplierId,
          partId: ctx.part.id,
          tradingPartnerSetupId: ctx.tpa.id,
          shipToSiteId: ctx.site.id,
          uom: ctx.tpa.uom,
          needByConvention: ctx.tpa.needByConvention,
          publishedBy: asDraft ? null : user.sub,
        })
        .returning();

      const line = inserted!;
      if (!asDraft) {
        await this.recordPublish(tx, line, user.sub, "publish");
      } else {
        await tx.insert(auditEvents).values({
          actorId: user.sub,
          entityType: "forecast_line",
          entityId: `${line.forecastId}:v${line.version}`,
          action: "draft",
          reasonCode: null,
          payload: { forecastId: line.forecastId, version: line.version },
        });
      }
      return this.serialize(line, ctx);
    });
  }

  async republish(forecastId: string, input: RepublishForecastInput, user: SessionClaims) {
    assertBuyerSession(user);
    await this.assertActor(user.sub);
    return this.db.transaction(async (tx) => {
      const previous = await this.latestInTx(tx, forecastId);
      if (!previous) {
        throw new NotFoundException(`Forecast ${forecastId} not found`);
      }
      assertForecastPublisher(user, previous.buyerId);

      const partId = input.partId ?? previous.partId;
      const shipToSiteId = input.shipToSiteId ?? previous.shipToSiteId;
      const ctx = await this.resolvePublishContext(
        tx,
        previous.tradingPartnerSetupId,
        partId,
        shipToSiteId,
      );

      if (previous.status === "published" || previous.status === "draft") {
        await tx
          .update(forecastLines)
          .set({ status: "superseded" })
          .where(eq(forecastLines.id, previous.id));
        await tx.insert(domainEvents).values({
          eventName: DOMAIN_EVENTS.ForecastSuperseded,
          aggregateType: "forecast_line",
          aggregateId: previous.forecastId,
          aggregateVersion: String(previous.version),
          actorId: user.sub,
          payload: {
            forecastId: previous.forecastId,
            version: previous.version,
            supersededBy: previous.version + 1,
          },
        });
      }

      const now = new Date();
      const [inserted] = await tx
        .insert(forecastLines)
        .values({
          forecastId: previous.forecastId,
          version: previous.version + 1,
          publishedAt: now,
          horizonBucket: weekStartingMonday(input.requestedDate),
          requestedQty: input.requestedQty,
          requestedDate: input.requestedDate,
          demandType: input.demandType,
          priority: input.priority ?? previous.priority,
          program: input.program === undefined ? previous.program : input.program,
          status: "published",
          buyerId: ctx.tpa.buyerId,
          supplierId: ctx.tpa.supplierId,
          partId: ctx.part.id,
          tradingPartnerSetupId: ctx.tpa.id,
          shipToSiteId: ctx.site.id,
          uom: ctx.tpa.uom,
          needByConvention: ctx.tpa.needByConvention,
          publishedBy: user.sub,
        })
        .returning();

      const line = inserted!;
      await this.recordPublish(tx, line, user.sub, "republish");
      return this.serialize(line, ctx);
    });
  }

  async publishDraft(forecastId: string, user: SessionClaims) {
    assertBuyerSession(user);
    await this.assertActor(user.sub);
    return this.db.transaction(async (tx) => {
      const latest = await this.latestInTx(tx, forecastId);
      if (!latest) throw new NotFoundException(`Forecast ${forecastId} not found`);
      assertForecastPublisher(user, latest.buyerId);
      if (latest.status !== "draft") {
        throw new ConflictException(`${forecastId} v${latest.version} is ${latest.status}, not draft`);
      }
      const now = new Date();
      const [updated] = await tx
        .update(forecastLines)
        .set({
          status: "published",
          publishedAt: now,
          publishedBy: user.sub,
        })
        .where(eq(forecastLines.id, latest.id))
        .returning();
      const line = updated!;
      await this.recordPublish(tx, line, user.sub, "publish_draft");
      return line;
    });
  }

  private async hydratedLines() {
    const rows = await this.db
      .select({
        line: forecastLines,
        buyer: buyers,
        supplier: suppliers,
        part: parts,
        site: sites,
      })
      .from(forecastLines)
      .innerJoin(buyers, eq(forecastLines.buyerId, buyers.id))
      .innerJoin(suppliers, eq(forecastLines.supplierId, suppliers.id))
      .innerJoin(parts, eq(forecastLines.partId, parts.id))
      .innerJoin(sites, eq(forecastLines.shipToSiteId, sites.id));

    const serialized = rows.map((r) => this.serialize(r.line, r));
    const byKey = new Map(serialized.map((row) => [`${row.forecastId}:${row.version}`, row]));
    return serialized.map((row) => {
      const prev = byKey.get(`${row.forecastId}:${row.version - 1}`);
      if (!prev) return { ...row, versionDeltaQty: null, versionDeltaDateDays: null };
      const qtyDelta = Number(row.requestedQty) - Number(prev.requestedQty);
      const dateDelta =
        (Date.parse(`${row.requestedDate}T00:00:00Z`) -
          Date.parse(`${prev.requestedDate}T00:00:00Z`)) /
        86_400_000;
      return {
        ...row,
        versionDeltaQty: String(qtyDelta),
        versionDeltaDateDays: dateDelta,
      };
    });
  }

  private serialize(
    line: LineRow,
    extras: {
      buyer?: typeof buyers.$inferSelect;
      supplier?: typeof suppliers.$inferSelect;
      part?: typeof parts.$inferSelect;
      site?: typeof sites.$inferSelect;
      tpa?: typeof tradingPartnerSetups.$inferSelect;
    },
  ) {
    return {
      id: line.id,
      forecastId: line.forecastId,
      version: line.version,
      status: line.status,
      publishedAt: toIso(line.publishedAt),
      publishedBy: line.publishedBy,
      horizonBucket: line.horizonBucket,
      requestedQty: line.requestedQty,
      requestedDate: line.requestedDate,
      demandType: line.demandType,
      priority: line.priority,
      program: line.program,
      uom: line.uom,
      needByConvention: line.needByConvention,
      tradingPartnerSetupId: line.tradingPartnerSetupId,
      buyerId: line.buyerId,
      supplierId: line.supplierId,
      partId: line.partId,
      shipToSiteId: line.shipToSiteId,
      buyerName: extras.buyer?.name ?? null,
      buyerPartnerId: extras.buyer?.partnerId ?? null,
      supplierName: extras.supplier?.name ?? null,
      supplierPartnerId: extras.supplier?.partnerId ?? null,
      buyerPartNumber: extras.part?.buyerPartNumber ?? null,
      mpn: extras.part?.mpn ?? null,
      revision: extras.part?.revision ?? null,
      maskSet: extras.part?.maskSet ?? null,
      porId: extras.part?.porId ?? null,
      shipToSiteCode: extras.site?.siteCode ?? null,
      shipToName: extras.site?.name ?? null,
      versionDeltaQty: null as string | null,
      versionDeltaDateDays: null as number | null,
    };
  }

  private diffVersions(versions: Array<ReturnType<ForecastService["serialize"]>>) {
    const diffs = [];
    for (let i = 1; i < versions.length; i++) {
      const from = versions[i - 1]!;
      const to = versions[i]!;
      diffs.push({
        fromVersion: from.version,
        toVersion: to.version,
        fields: [
          {
            field: "requestedQty",
            from: from.requestedQty,
            to: to.requestedQty,
            changed: from.requestedQty !== to.requestedQty,
          },
          {
            field: "requestedDate",
            from: from.requestedDate,
            to: to.requestedDate,
            changed: from.requestedDate !== to.requestedDate,
          },
          {
            field: "demandType",
            from: from.demandType,
            to: to.demandType,
            changed: from.demandType !== to.demandType,
          },
          {
            field: "priority",
            from: String(from.priority),
            to: String(to.priority),
            changed: from.priority !== to.priority,
          },
          {
            field: "program",
            from: from.program,
            to: to.program,
            changed: from.program !== to.program,
          },
          {
            field: "revision",
            from: from.revision,
            to: to.revision,
            changed: from.partId !== to.partId,
          },
        ],
      });
    }
    return diffs;
  }

  private async resolvePublishContext(
    tx: Pick<typeof this.db, "select">,
    tradingPartnerSetupId: string,
    partId: string,
    shipToSiteId: string,
  ) {
    const [tpa] = await tx
      .select()
      .from(tradingPartnerSetups)
      .where(eq(tradingPartnerSetups.id, tradingPartnerSetupId));
    if (!tpa) throw new BadRequestException("Unknown tradingPartnerSetupId");

    const [part] = await tx.select().from(parts).where(eq(parts.id, partId));
    if (!part) throw new BadRequestException("Unknown partId");
    if (!part.buyerPartNumber || !part.mpn) {
      throw new BadRequestException("Part must have buyer part number and MPN");
    }
    if (part.buyerId !== tpa.buyerId) {
      throw new BadRequestException("Part buyer does not match trading partner setup");
    }

    const [site] = await tx.select().from(sites).where(eq(sites.id, shipToSiteId));
    if (!site) throw new BadRequestException("Unknown shipToSiteId");
    if (site.role !== "ship_to" || site.buyerId !== tpa.buyerId) {
      throw new BadRequestException("shipToSiteId must be a buyer ship-to site for this TPA");
    }

    const [buyer] = await tx.select().from(buyers).where(eq(buyers.id, tpa.buyerId));
    const [supplier] = await tx.select().from(suppliers).where(eq(suppliers.id, tpa.supplierId));

    return { tpa, part, site, buyer, supplier };
  }

  private async latestInTx(tx: Pick<typeof this.db, "select">, forecastId: string) {
    const [row] = await tx
      .select()
      .from(forecastLines)
      .where(eq(forecastLines.forecastId, forecastId))
      .orderBy(desc(forecastLines.version))
      .limit(1);
    return row ?? null;
  }

  private async recordPublish(
    tx: Pick<typeof this.db, "insert">,
    line: LineRow,
    actorId: string,
    action: string,
  ) {
    await tx.insert(domainEvents).values({
      eventName: DOMAIN_EVENTS.ForecastPublished,
      aggregateType: "forecast_line",
      aggregateId: line.forecastId,
      aggregateVersion: String(line.version),
      actorId,
      payload: {
        forecastId: line.forecastId,
        version: line.version,
        requestedQty: line.requestedQty,
        requestedDate: line.requestedDate,
        demandType: line.demandType,
      },
    });
    await tx.insert(auditEvents).values({
      actorId,
      entityType: "forecast_line",
      entityId: `${line.forecastId}:v${line.version}`,
      action,
      reasonCode: null,
      payload: {
        forecastId: line.forecastId,
        version: line.version,
        requestedQty: line.requestedQty,
        requestedDate: line.requestedDate,
      },
    });
  }

  private async assertActor(actorId: string) {
    const [actor] = await this.db.select().from(actors).where(eq(actors.id, actorId));
    if (!actor) {
      throw new BadRequestException(`Unknown actor_id ${actorId}`);
    }
  }

  private async assertNewForecastId(forecastId: string) {
    const [existing] = await this.db
      .select({ forecastId: forecastLines.forecastId })
      .from(forecastLines)
      .where(eq(forecastLines.forecastId, forecastId))
      .limit(1);
    if (existing) {
      throw new ConflictException(
        `${forecastId} already exists — republish via POST /forecasts/${forecastId}/versions`,
      );
    }
    return forecastId.toUpperCase();
  }

  private async allocateForecastId() {
    for (let i = 0; i < 12; i++) {
      const candidate = `FC-${String(Math.floor(10000 + Math.random() * 90000))}`;
      const [existing] = await this.db
        .select({ forecastId: forecastLines.forecastId })
        .from(forecastLines)
        .where(eq(forecastLines.forecastId, candidate))
        .limit(1);
      if (!existing) return candidate;
    }
    throw new ConflictException("Could not allocate a forecast id");
  }
}
