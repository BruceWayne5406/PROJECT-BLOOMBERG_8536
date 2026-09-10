import { Controller, Get } from "@nestjs/common";
import { createPool } from "@scp/db";

@Controller()
export class HealthController {
  @Get("health")
  async health() {
    let postgres: "up" | "down" = "down";
    try {
      const pool = createPool();
      await pool.query("select 1");
      await pool.end();
      postgres = "up";
    } catch {
      postgres = "down";
    }
    return {
      status: postgres === "up" ? "ok" : "degraded",
      phase: 1,
      postgres,
    };
  }
}
