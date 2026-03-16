import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Persona } from "@/types.ts";

export type TranscriptEvent =
  | {
      type: "session_start";
      sessionId: string;
      topic: string;
      protocol: string;
      timestamp: number;
    }
  | {
      type: "personas_ready";
      personas: Persona[];
      timestamp: number;
    }
  | {
      type: "round_start";
      round: number;
      label: string;
      timestamp: number;
    }
  | {
      type: "message";
      round: number;
      personaId: string;
      personaName: string;
      content: string;
      timestamp: number;
    }
  | {
      type: "user_direction";
      content: string;
      timestamp: number;
    }
  | {
      type: "moderator";
      content: string;
      timestamp: number;
    }
  | {
      type: "summary";
      content: string;
      timestamp: number;
    }
  | {
      type: "session_complete";
      timestamp: number;
    }
  | {
      type: "session_interrupted";
      reason: string;
      timestamp: number;
    };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u3000-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function formatTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export class Transcript {
  readonly sessionId: string;
  readonly dir: string;
  readonly baseName: string;
  private jsonlPath: string;

  constructor(sessionDir: string, topic: string) {
    const ts = formatTimestamp();
    const slug = slugify(topic);
    this.sessionId = `${ts}-${slug}`;
    this.dir = sessionDir;
    this.baseName = this.sessionId;
    this.jsonlPath = join(this.dir, `${this.baseName}.jsonl`);
  }

  async init(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  async append(event: TranscriptEvent): Promise<void> {
    await appendFile(this.jsonlPath, `${JSON.stringify(event)}\n`);
  }
}
