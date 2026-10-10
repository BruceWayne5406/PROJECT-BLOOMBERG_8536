import { Body, Controller, Get, Inject, Post, Req } from "@nestjs/common";
import { loginSchema, signupSchema } from "@scp/domain";
import type { LoginInput, SignupInput } from "@scp/domain";
import { ZodPipe } from "../../common/zod.pipe";
import { AuthService } from "./auth.service";
import { Public } from "./public";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Get("organizations")
  organizations() {
    return this.auth.organizations();
  }

  @Public()
  @Post("login")
  login(@Body(new ZodPipe(loginSchema)) body: LoginInput) {
    return this.auth.login(body);
  }

  @Public()
  @Post("signup")
  signup(@Body(new ZodPipe(signupSchema)) body: SignupInput) {
    return this.auth.signup(body);
  }

  @Get("me")
  me(@Req() req: { actorId?: string }) {
    return this.auth.me(req.actorId ?? "");
  }
}
