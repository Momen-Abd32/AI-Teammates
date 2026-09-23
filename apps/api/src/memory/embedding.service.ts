import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";

const DEFAULT_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

@Injectable()
export class MemoryEmbeddingService {
  async embed(text: string): Promise<number[]> {
    const input = text.trim();
    if (!input) throw new BadRequestException("Embedding input is required");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException("Memory embeddings are not configured");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.EMBEDDING_MODEL ?? DEFAULT_MODEL,
        input,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new ServiceUnavailableException(`Embedding provider error (${response.status}): ${body.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const embedding = payload.data?.[0]?.embedding;

    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new ServiceUnavailableException("Embedding provider returned an invalid vector");
    }

    return embedding;
  }
}