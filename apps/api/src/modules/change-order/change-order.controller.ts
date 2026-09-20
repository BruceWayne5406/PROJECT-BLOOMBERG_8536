import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { decideChangeOrderSchema, proposeChangeOrderSchema } from "@scp/domain";
import type { DecideChangeOrderInput, ProposeChangeOrderInput } from "@scp/domain";
import { CurrentUser } from "../../common/current-user";
import { ZodPipe } from "../../common/zod.pipe";
import type { SessionClaims } from "../auth/token";
import { ChangeOrderService } from "./change-order.service";

@Controller()
export class ChangeOrderController {
  constructor(@Inject(ChangeOrderService) private readonly orders: ChangeOrderService) {}

  @Get("change-orders")
  list() {
    return this.orders.list();
  }

  @Get("change-orders/:changeOrderId")
  get(@Param("changeOrderId") changeOrderId: string) {
    return this.orders.get(changeOrderId.toUpperCase());
  }

  @Post("purchase-orders/:id/change-orders")
  propose(
    @Param("id") id: string,
    @Body(new ZodPipe(proposeChangeOrderSchema)) body: ProposeChangeOrderInput,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.orders.propose(id, body, user);
  }

  @Post("change-orders/:changeOrderId/decision")
  decide(
    @Param("changeOrderId") changeOrderId: string,
    @Body(new ZodPipe(decideChangeOrderSchema)) body: DecideChangeOrderInput,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.orders.decide(changeOrderId.toUpperCase(), body, user);
  }
}
