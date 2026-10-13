import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";
import { randomUUID } from "crypto";

export type ActivityEvent = {
  id: string;
  type:
    | "agent.started"
    | "memory.retrieved"
    | "tool.started"
    | "tool.completed"
    | "agent.delegated"
    | "approval.required"
    | "approval.approved"
    | "approval.rejected"
    | "agent.completed"
    | "agent.task_completed"
    | "agent.failed";
  companyId: string;
  employeeId: string;
  agentId: string;
  conversationId?: string;
  message?: string;
  timestamp: string;
};

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const REDIS_ENABLED = process.env.REDIS_ENABLED !== "false";
const REDIS_OPTIONS = {
  lazyConnect: true,
  connectTimeout: 1500,
  maxRetriesPerRequest: 1,
  retryStrategy: (attempt: number) => (attempt <= 3 ? attempt * 250 : null),
};

@Injectable()
export class ActivityEventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActivityEventService.name);
  private readonly publisher = REDIS_ENABLED ? new Redis(REDIS_URL, REDIS_OPTIONS) : null;
  private readonly subscriber = REDIS_ENABLED ? new Redis(REDIS_URL, REDIS_OPTIONS) : null;
  private redisAvailable = false;
  private readonly listeners = new Set<(event: ActivityEvent) => void>();

  async onModuleInit() {
    if (!this.subscriber) {
      this.logger.warn("Redis activity transport disabled; using in-process events.");
      return;
    }

    this.subscriber.on("message", (_channel, payload) => {
      try {
        const event = JSON.parse(payload) as ActivityEvent;
        this.notifyListeners(event);
      } catch (error) {
        this.logger.warn("Invalid activity event", error instanceof Error ? error.message : String(error));
      }
    });
    this.subscriber.on("error", (error) => {
      this.logger.warn(`Redis activity subscriber error: ${error.message}`);
    });
    this.publisher?.on("error", (error) => {
      this.logger.warn(`Redis activity publisher error: ${error.message}`);
    });

    let timeout: NodeJS.Timeout | undefined;
    try {
      const subscribed = await Promise.race([
        this.subscriber.subscribe("agent-activity").then(() => true),
        new Promise<boolean>((resolve) => {
          timeout = setTimeout(() => resolve(false), 1800);
        }),
      ]);
      if (timeout) clearTimeout(timeout);

      if (!subscribed) {
        this.logger.warn("Redis did not become available during startup; API will start with local activity events.");
        this.subscriber.disconnect();
        this.publisher?.disconnect();
        return;
      }
      this.redisAvailable = true;
    } catch (error) {
      if (timeout) clearTimeout(timeout);
      this.logger.warn(`Redis activity transport unavailable; using local events: ${error instanceof Error ? error.message : String(error)}`);
      this.subscriber.disconnect();
      this.publisher?.disconnect();
    }
  }

  async publish(input: Omit<ActivityEvent, "id" | "timestamp">) {
    const event: ActivityEvent = { ...input, id: randomUUID(), timestamp: new Date().toISOString() };
    if (this.redisAvailable && this.publisher) {
      try {
        await this.publisher.publish("agent-activity", JSON.stringify(event));
        return event;
      } catch (error) {
        this.logger.warn(`Could not publish activity event to Redis: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    this.notifyListeners(event);
    return event;
  }

  subscribe(listener: (event: ActivityEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(event: ActivityEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        this.logger.warn("Activity event listener failed", error instanceof Error ? error.message : String(error));
      }
    }
  }

  async onModuleDestroy() {
    await Promise.allSettled(
      [this.publisher, this.subscriber].filter((client): client is Redis => client !== null).map(async (client) => {
        if (client.status === "end") return;
        if (client.status === "wait") {
          client.disconnect();
          return;
        }
        await client.quit();
      }),
    );
  }
}
