import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import {
  acknowledgePoSchema,
  convertCommitSchema,
  recordExecutionSchema,
} from "@scp/domain";
import type {
  AcknowledgePoInput,
  ConvertCommitInput,
  RecordExecutionInput,
} from "@scp/domain";
import { CurrentUser } from "../../common/current-user";
import { ZodPipe } from "../../common/zod.pipe";
import type { SessionClaims } from "../auth/token";
import { PurchaseOrderService } from "./purchase-order.service";

@Controller()
export class PurchaseOrderController {
  constructor(@Inject(PurchaseOrderService) private readonly pos: PurchaseOrderService) {}

  @Get("purchase-orders")
  list() {
    return this.pos.list();
  }

  @Get("purchase-orders/:id")
  get(@Param("id") id: string) {
    return this.pos.get(id);
  }

  @Post("commits/:commitId/convert")
  convert(
    @Param("commitId") commitId: string,
    @Body(new ZodPipe(convertCommitSchema)) body: ConvertCommitInput,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.pos.convert(commitId.toUpperCase(), body, user);
  }

  @Post("purchase-orders/:id/acknowledgements")
  acknowledge(
    @Param("id") id: string,
    @Body(new ZodPipe(acknowledgePoSchema)) body: AcknowledgePoInput,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.pos.acknowledge(id, body, user);
  }

  @Post("purchase-orders/:id/execution")
  execution(
    @Param("id") id: string,
    @Body(new ZodPipe(recordExecutionSchema)) body: RecordExecutionInput,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.pos.recordExecution(id, body, user);
  }
}
