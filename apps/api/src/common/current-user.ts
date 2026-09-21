import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { SessionClaims } from "../modules/auth/token";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user?: SessionClaims }>();
    return req.user;
  },
);
