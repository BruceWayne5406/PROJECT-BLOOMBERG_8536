import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { DbModule } from "./db/db.module";
import { HealthModule } from "./health/health.module";
import { AuthGuard } from "./modules/auth/auth.guard";
import { AuthModule } from "./modules/auth/auth.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { TradingPartnerSetupModule } from "./modules/trading-partner-setup/trading-partner-setup.module";
import { ForecastModule } from "./modules/forecast/forecast.module";
import { CommitModule } from "./modules/commit/commit.module";
import { PurchaseOrderModule } from "./modules/purchase-order/purchase-order.module";
import { ChangeOrderModule } from "./modules/change-order/change-order.module";
import { ExceptionModule } from "./modules/exception/exception.module";
import { ExcelImportModule } from "./modules/excel-import/excel-import.module";
import { ErpWritebackModule } from "./modules/erp-writeback/erp-writeback.module";
import { AuditModule } from "./modules/audit/audit.module";

@Module({
  imports: [
    DbModule,
    HealthModule,
    AuthModule,
    IdentityModule,
    TradingPartnerSetupModule,
    ForecastModule,
    CommitModule,
    PurchaseOrderModule,
    ChangeOrderModule,
    ExceptionModule,
    ExcelImportModule,
    ErpWritebackModule,
    AuditModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
