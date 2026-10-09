import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC } from "./public";
import { verifySession } from "./token";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      actorId?: string;
      user?: unknown;
    }>();
    const raw = req.headers.authorization ?? "";
    const token = raw.replace(/^Bearer\s+/i, "");
    if (!token) throw new UnauthorizedException("Sign in required");
    try {
      const user = await verifySession(token);
      req.user = user;
      req.actorId = user.sub;
      return true;
    } catch {
      throw new UnauthorizedException("Session expired — sign in again");
    }
  }
}
