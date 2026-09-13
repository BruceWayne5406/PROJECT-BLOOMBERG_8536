import { Module } from "@nestjs/common";
import { ChangeOrderModule } from "../change-order/change-order.module";
import { CommitModule } from "../commit/commit.module";
import { ForecastModule } from "../forecast/forecast.module";
import { PurchaseOrderModule } from "../purchase-order/purchase-order.module";
import { EdiIngestController } from "./edi-ingest.controller";
import { EdiIngestService } from "./edi-ingest.service";
import { ExcelImportController } from "./excel-import.controller";
import { ExcelImportService } from "./excel-import.service";

/** Phase 7 Excel + Phase 10 EDI. Both feed the same services after parse. */
@Module({
  imports: [ForecastModule, CommitModule, PurchaseOrderModule, ChangeOrderModule],
  controllers: [ExcelImportController, EdiIngestController],
  providers: [ExcelImportService, EdiIngestService],
})
export class ExcelImportModule {}
