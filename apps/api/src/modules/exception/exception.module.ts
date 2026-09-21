import { Module } from "@nestjs/common";
import { ErpWritebackModule } from "../erp-writeback/erp-writeback.module";
import { ExceptionController } from "./exception.controller";
import { ExceptionService } from "./exception.service";
import { QueueService } from "../queue/queue.service";

/** Phase 4. SLA-breach detection; silence is not acceptance. */
@Module({
  imports: [ErpWritebackModule],
  controllers: [ExceptionController],
  providers: [ExceptionService, QueueService],
  exports: [ExceptionService],
})
export class ExceptionModule {}
