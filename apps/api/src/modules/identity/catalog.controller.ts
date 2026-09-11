import { Controller, Get, Inject } from "@nestjs/common";
import { CatalogService } from "./catalog.service";

@Controller("catalog")
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get("trading-partner-setups")
  tradingPartnerSetups() {
    return this.catalog.tradingPartnerSetups();
  }

  @Get("parts")
  parts() {
    return this.catalog.parts();
  }

  @Get("sites")
  sites() {
    return this.catalog.sites();
  }
}
