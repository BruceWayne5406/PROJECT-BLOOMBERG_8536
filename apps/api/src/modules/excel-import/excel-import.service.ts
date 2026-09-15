import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { parts, sites, tradingPartnerSetups } from "@scp/db";
import {
  DEMAND_TYPES,
  offerSplitsSchema,
  publishForecastSchema,
} from "@scp/domain";
import { eq } from "drizzle-orm";
import { DbService } from "../../db/db.service";
import type { SessionClaims } from "../auth/token";
import { CommitService } from "../commit/commit.service";
import { ForecastService } from "../forecast/forecast.service";

type RowError = { sheet: string; row: number; message: string };

@Injectable()
export class ExcelImportService {
  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(ForecastService) private readonly forecasts: ForecastService,
    @Inject(CommitService) private readonly commits: CommitService,
  ) {}

  private get db() {
    return this.dbService.db;
  }

  async importWorkbook(buffer: Buffer, user: SessionClaims) {
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const accepted: Array<{ sheet: string; row: number; id: string }> = [];
    const errors: RowError[] = [];

    const forecastSheet = wb.worksheets.find((s) => s.name.toLowerCase() === "forecasts");
    const commitSheet = wb.worksheets.find((s) => s.name.toLowerCase() === "commits");
    if (!forecastSheet && !commitSheet) {
      throw new BadRequestException(
        "Workbook needs a forecasts and/or commits sheet. Empty cells are not guessed.",
      );
    }

    if (forecastSheet) {
      const headers = headerMap(forecastSheet);
      for (let r = 2; r <= forecastSheet.rowCount; r++) {
        const row = forecastSheet.getRow(r);
        if (isEmpty(row)) continue;
        await this.importForecastRow(headers, row, r, user, accepted, errors);
      }
    }

    if (commitSheet) {
      const headers = headerMap(commitSheet);
      const grouped = new Map<
        string,
        Array<{ rowNumber: number; split: Record<string, unknown> }>
      >();
      for (let r = 2; r <= commitSheet.rowCount; r++) {
        const row = commitSheet.getRow(r);
        if (isEmpty(row)) continue;
        const cell = (name: string) => cellString(row.getCell(col(headers, name)).value);
        const forecastId = cell("forecast_id");
        const committedQty = cell("committed_qty");
        if (!forecastId || committedQty === "") {
          errors.push({
            sheet: "commits",
            row: r,
            message: "forecast_id and committed_qty are required",
          });
          continue;
        }
        const list = grouped.get(forecastId.toUpperCase()) ?? [];
        list.push({
          rowNumber: r,
          split: {
            commitId: cell("commit_id") || undefined,
            committedQty,
            committedDate: cell("committed_date") || null,
            commitGrade: cell("commit_grade") || null,
            reasonCode: cell("reason_code") || null,
            comment: cell("comment") || null,
          },
        });
        grouped.set(forecastId.toUpperCase(), list);
      }
      for (const [forecastId, rows] of grouped) {
        try {
          if (user.partyType !== "supplier") {
            throw new Error("Only the supplying partner can import commit rows");
          }
          const parsed = offerSplitsSchema.parse({ splits: rows.map((r) => r.split) });
          await this.commits.offer(forecastId, parsed, user);
          for (const row of rows) {
            accepted.push({
              sheet: "commits",
              row: row.rowNumber,
              id: String(row.split.commitId ?? forecastId),
            });
          }
        } catch (err) {
          for (const row of rows) {
            errors.push({
              sheet: "commits",
              row: row.rowNumber,
              message: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    }

    return {
      channel: "excel",
      acceptedCount: accepted.length,
      rejectedCount: errors.length,
      accepted,
      errors,
    };
  }

  private async importForecastRow(
    headers: Map<string, number>,
    row: { getCell: (n: number) => { value: unknown } },
    rowNumber: number,
    user: SessionClaims,
    accepted: Array<{ sheet: string; row: number; id: string }>,
    errors: RowError[],
  ) {
    try {
      if (user.partyType !== "buyer") {
        throw new Error("Only the buying partner can import forecast rows");
      }
      const cell = (name: string) => cellString(row.getCell(col(headers, name)).value);
      const requestedQty = cell("requested_qty");
      const requestedDate = cell("requested_date");
      const demandType = cell("demand_type");
      if (!requestedQty || !requestedDate || !demandType) {
        throw new Error("requested_qty, requested_date, and demand_type are required");
      }
      if (!DEMAND_TYPES.includes(demandType as (typeof DEMAND_TYPES)[number])) {
        throw new Error(`demand_type ${demandType} is not a known value`);
      }

      let tradingPartnerSetupId = cell("trading_partner_setup_id");
      let partId = cell("part_id");
      let shipToSiteId = cell("ship_to_site_id");
      const buyerPart = cell("buyer_part_number");

      if (!partId && buyerPart) {
        const matches = (await this.db.select().from(parts)).filter(
          (p) => p.buyerPartNumber === buyerPart && p.buyerId === user.partnerId,
        );
        if (matches.length !== 1) {
          throw new Error(
            `buyer_part_number ${buyerPart} did not resolve to exactly one part for this buyer`,
          );
        }
        partId = matches[0]!.id;
      }
      if (!tradingPartnerSetupId && partId) {
        const [part] = (await this.db.select().from(parts)).filter((p) => p.id === partId);
        const tpas = (await this.db.select().from(tradingPartnerSetups)).filter(
          (t) => t.buyerId === (part?.buyerId ?? user.partnerId),
        );
        if (tpas.length !== 1) {
          throw new Error("trading_partner_setup_id is required when more than one TPA exists");
        }
        tradingPartnerSetupId = tpas[0]!.id;
      }
      if (!shipToSiteId && user.partnerId) {
        const shipTos = (await this.db.select().from(sites)).filter(
          (s) => s.role === "ship_to" && s.buyerId === user.partnerId,
        );
        if (shipTos.length !== 1) {
          throw new Error("ship_to_site_id is required when more than one ship-to exists");
        }
        shipToSiteId = shipTos[0]!.id;
      }

      const parsed = publishForecastSchema.parse({
        forecastId: cell("forecast_id") || undefined,
        tradingPartnerSetupId,
        partId,
        shipToSiteId,
        requestedQty,
        requestedDate,
        demandType,
        priority: cell("priority") ? Number(cell("priority")) : undefined,
        program: cell("program") || null,
      });
      const created = await this.forecasts.publish(parsed, user);
      accepted.push({ sheet: "forecasts", row: rowNumber, id: created.forecastId });
    } catch (err) {
      errors.push({
        sheet: "forecasts",
        row: rowNumber,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

}

function headerMap(sheet: { getRow: (n: number) => { eachCell: (cb: (cell: { value: unknown }, col: number) => void) => void } }) {
  const map = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const key = cellString(cell.value).toLowerCase();
    if (key) map.set(key, colNumber);
  });
  return map;
}

function col(headers: Map<string, number>, name: string) {
  return headers.get(name) ?? 0;
}

function cellString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && value && "text" in value) {
    return String((value as { text: string }).text ?? "").trim();
  }
  if (typeof value === "object" && value && "result" in value) {
    return String((value as { result: unknown }).result ?? "").trim();
  }
  return String(value).trim();
}

function isEmpty(row: { cellCount: number; getCell: (n: number) => { value: unknown } }) {
  for (let i = 1; i <= row.cellCount; i++) {
    if (cellString(row.getCell(i).value)) return false;
  }
  return true;
}
