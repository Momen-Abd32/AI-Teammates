import { Injectable } from "@nestjs/common";
import { MemoryScope } from "../domain";

export interface MemoryCandidate {
  content:string;
  scope:MemoryScope;
}

@Injectable()
export class MemoryLearningService {
  private readonly signals = [
    /\bI (?:always|usually|normally|prefer|like to|use|work with|write|build|structure)\b/i,
    /\bwe (?:always|usually|use|follow|keep|structure)\b/i,
    /\bmy (?:workflow|process|convention|preference|approach|pattern)\b/i,
    /\bfor (?:this|our) projects?,? (?:we|I)\b/i,
  ];

  extract(message:string, response:string): MemoryCandidate | null {
    const text = message.trim();
    if (!text || text.length < 20 || text.length > 4000) return null;
    if (!this.signals.some(pattern => pattern.test(text))) return null;
    if (/(password|api\s*key|apikey|secret|private\s*key|credit\s*card|token\s*=)/i.test(text)) return null;

    // Automatic learning is intentionally PRIVATE-only. TEAM/COMPANY knowledge
    // must be explicitly promoted by an authorized user instead of being inferred.
    return {
      content: text,
      scope: "PRIVATE",
    };
  }
}
