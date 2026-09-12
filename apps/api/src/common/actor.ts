import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const ActorId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<{
    actorId?: string;
    header: (name: string) => string | undefined;
  }>();
  return req.actorId || req.header("x-actor-id") || process.env.DEV_ACTOR_ID || "buyer.planner.seed";
});
