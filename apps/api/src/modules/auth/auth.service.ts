import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { compare, hash } from "bcryptjs";
import { actors, buyers, suppliers, users } from "@scp/db";
import type { LoginInput, SignupInput } from "@scp/domain";
import { eq } from "drizzle-orm";
import { DbService } from "../../db/db.service";
import { signSession, type SessionClaims } from "./token";

@Injectable()
export class AuthService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db;
  }

  async organizations() {
    const [buyerRows, supplierRows] = await Promise.all([
      this.db.select().from(buyers),
      this.db.select().from(suppliers),
    ]);
    return [
      ...buyerRows.map((b) => ({
        id: b.id,
        partyType: "buyer" as const,
        partnerId: b.partnerId,
        name: b.name,
      })),
      ...supplierRows.map((s) => ({
        id: s.id,
        partyType: "supplier" as const,
        partnerId: s.partnerId,
        name: s.name,
      })),
    ];
  }

  async login(input: LoginInput) {
    const email = input.email.trim().toLowerCase();
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    if (!user || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException("Work email or password is incorrect");
    }
    const [actor] = await this.db.select().from(actors).where(eq(actors.id, user.actorId));
    if (!actor || actor.partyType === "system") {
      throw new UnauthorizedException("This account is not allowed to sign in");
    }
    return this.issue(user.email, user.role, actor);
  }

  async signup(input: SignupInput) {
    const email = input.email.trim().toLowerCase();
    const [existing] = await this.db.select().from(users).where(eq(users.email, email));
    if (existing) throw new ConflictException("An account already exists for that work email");

    if (input.partyType === "buyer") {
      const [buyer] = await this.db.select().from(buyers).where(eq(buyers.id, input.partnerId));
      if (!buyer) throw new BadRequestException("Unknown buyer organization");
    } else {
      const [supplier] = await this.db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, input.partnerId));
      if (!supplier) throw new BadRequestException("Unknown supplier organization");
    }

    const actorId = await this.allocateActorId(input.partyType, input.role, email);

    return this.db.transaction(async (tx) => {
      await tx.insert(actors).values({
        id: actorId,
        displayName: input.displayName.trim(),
        partyType: input.partyType,
        partnerId: input.partnerId,
      });
      await tx.insert(users).values({
        email,
        passwordHash: await hash(input.password, 10),
        actorId,
        role: input.role,
      });
      const [actor] = await tx.select().from(actors).where(eq(actors.id, actorId));
      return this.issue(email, input.role, actor!);
    });
  }

  async me(actorId: string) {
    const [user] = await this.db.select().from(users).where(eq(users.actorId, actorId));
    const [actor] = await this.db.select().from(actors).where(eq(actors.id, actorId));
    if (!user || !actor) throw new UnauthorizedException();
    return this.publicUser(user.email, user.role, actor);
  }

  private async issue(
    email: string,
    role: "planner" | "procurement",
    actor: typeof actors.$inferSelect,
  ) {
    const claims: SessionClaims = {
      sub: actor.id,
      email,
      displayName: actor.displayName,
      partyType: actor.partyType === "supplier" ? "supplier" : "buyer",
      partnerId: actor.partnerId,
      role,
    };
    return {
      token: await signSession(claims),
      user: this.publicUser(email, role, actor),
    };
  }

  private publicUser(
    email: string,
    role: "planner" | "procurement",
    actor: typeof actors.$inferSelect,
  ) {
    return {
      actorId: actor.id,
      email,
      displayName: actor.displayName,
      partyType: actor.partyType,
      partnerId: actor.partnerId,
      role,
    };
  }

  private async allocateActorId(
    partyType: "buyer" | "supplier",
    role: "planner" | "procurement",
    email: string,
  ) {
    const local = email.split("@")[0]?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "user";
    const base = `${partyType}.${role}.${local}`;
    const [taken] = await this.db.select().from(actors).where(eq(actors.id, base));
    if (!taken) return base;
    return `${base}.${Date.now().toString(36)}`;
  }
}
