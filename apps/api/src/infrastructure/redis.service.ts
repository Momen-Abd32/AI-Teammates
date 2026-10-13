import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly isEnabled = process.env.REDIS_ENABLED !== "false";
  readonly client = new Redis(REDIS_URL, {
    lazyConnect: !this.isEnabled,
    connectTimeout: 1500,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => (attempt <= 3 ? attempt * 250 : null),
  });

  async publish(stream: string, message: Record<string, string>) {
    this.assertEnabled();
    return this.client.xadd(stream, "*", ...Object.entries(message).flat());
  }

  async read(stream: string, group: string, consumer: string, count = 10) {
    if (!this.isEnabled) return null;
    await this.client.xgroup("CREATE", stream, group, "$", "MKSTREAM").catch(() => undefined);
    return this.client.xreadgroup("GROUP", group, consumer, "COUNT", count, "BLOCK", 1000, "STREAMS", stream, ">");
  }

  async ack(stream: string, group: string, id: string) {
    this.assertEnabled();
    return this.client.xack(stream, group, id);
  }

  async readMatching(stream: string, taskId: string) {
    this.assertEnabled();
    const rows = await this.client.xrange(stream, "-", "+", "COUNT", 100);
    return rows
      .filter(([, fields]) => {
        for (let i = 0; i < fields.length; i += 2) {
          if (fields[i] === "taskId" && fields[i + 1] === taskId) return true;
        }
        return false;
      })
      .map(([id, fields]) => {
        const out: Record<string, string> = { id };
        for (let i = 0; i < fields.length; i += 2) out[fields[i]] = fields[i + 1];
        return out;
      });
  }

  async ping(): Promise<string> {
    if (!this.isEnabled) return "disabled";
    let timeout: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        this.client.ping(),
        new Promise<string>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Redis ping timed out")), 1500);
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private assertEnabled() {
    if (!this.isEnabled) {
      throw new Error("Redis-dependent feature is unavailable because REDIS_ENABLED=false.");
    }
  }

  async onModuleDestroy() {
    if (this.client.status === "end") return;
    if (this.client.status === "wait") {
      this.client.disconnect();
      return;
    }
    await this.client.quit().catch(() => this.client.disconnect());
  }
}
