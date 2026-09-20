import { Inject, Injectable } from "@nestjs/common";
import { buyers, parts, sites, suppliers, tradingPartnerSetups } from "@scp/db";
import { eq } from "drizzle-orm";
import { DbService } from "../../db/db.service";

@Injectable()
export class CatalogService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async tradingPartnerSetups() {
    const rows = await this.dbService.db
      .select({
        setup: tradingPartnerSetups,
        buyer: buyers,
        supplier: suppliers,
      })
      .from(tradingPartnerSetups)
      .innerJoin(buyers, eq(tradingPartnerSetups.buyerId, buyers.id))
      .innerJoin(suppliers, eq(tradingPartnerSetups.supplierId, suppliers.id));

    return rows.map((r) => ({
      id: r.setup.id,
      buyerId: r.setup.buyerId,
      supplierId: r.setup.supplierId,
      buyerName: r.buyer.name,
      buyerPartnerId: r.buyer.partnerId,
      supplierName: r.supplier.name,
      supplierPartnerId: r.supplier.partnerId,
      uom: r.setup.uom,
      needByConvention: r.setup.needByConvention,
      incoterms: r.setup.incoterms,
      currency: r.setup.currency,
      firmFenceWeeks: r.setup.firmFenceWeeks,
      frozenFenceWeeks: r.setup.frozenFenceWeeks,
      planningFenceWeeks: r.setup.planningFenceWeeks,
      responseSlaBusinessDays: r.setup.responseSlaBusinessDays,
    }));
  }

  async parts() {
    const rows = await this.dbService.db
      .select({ part: parts, buyer: buyers })
      .from(parts)
      .innerJoin(buyers, eq(parts.buyerId, buyers.id));
    return rows.map((r) => ({
      id: r.part.id,
      buyerId: r.part.buyerId,
      buyerName: r.buyer.name,
      buyerPartNumber: r.part.buyerPartNumber,
      mpn: r.part.mpn,
      revision: r.part.revision,
      maskSet: r.part.maskSet,
      porId: r.part.porId,
    }));
  }

  async sites() {
    const rows = await this.dbService.db.select().from(sites);
    return rows.map((s) => ({
      id: s.id,
      partyType: s.partyType,
      buyerId: s.buyerId,
      supplierId: s.supplierId,
      siteCode: s.siteCode,
      role: s.role,
      name: s.name,
    }));
  }
}
