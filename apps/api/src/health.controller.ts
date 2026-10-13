import { Controller, Get } from "@nestjs/common";
import { DatabaseService } from "./infrastructure/database.service";
import { RedisService } from "./infrastructure/redis.service";

@Controller("health")
export class HealthController {
  constructor(private readonly db: DatabaseService, private readonly redis: RedisService) {}

  @Get()
  async health() {
    const checks: { database: "up" | "down"; redis: "up" | "down" | "disabled" } = {
      database: "down",
      redis: this.redis.isEnabled ? "down" : "disabled",
    };

    try {
      await this.db.query("SELECT 1");
      checks.database = "up";
    } catch {
      // Health endpoint should report dependency status instead of throwing.
    }

    if (this.redis.isEnabled) {
      try {
        const result = await this.redis.ping();
        checks.redis = result === "PONG" ? "up" : "down";
      } catch {
        checks.redis = "down";
      }
    }

    const healthy = checks.database === "up" && (checks.redis === "up" || checks.redis === "disabled");
    return { status: healthy ? "ok" : "degraded", checks };
  }
}
