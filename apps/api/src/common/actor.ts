import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const ActorId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<{ header: (name: string) => string | undefined }>();
  return req.header("x-actor-id") || process.env.DEV_ACTOR_ID || "buyer.planner.seed";
});
