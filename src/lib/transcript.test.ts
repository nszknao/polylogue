import { afterEach, describe, expect, test } from "bun:test";
import { readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { Transcript } from "@/lib/transcript.ts";

const TEST_DIR = join(import.meta.dir, "../../.test-sessions");

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe("Transcript", () => {
  test("generates session ID with timestamp and slug", () => {
    const t = new Transcript(TEST_DIR, "AI toy subscription");
    expect(t.sessionId).toMatch(/^\d{8}-\d{6}-ai-toy-subscription$/);
  });

  test("slugifies Japanese text", () => {
    const t = new Transcript(TEST_DIR, "AIトイのサブスク事業");
    expect(t.sessionId).toMatch(/^\d{8}-\d{6}-aiトイのサブスク事業$/);
  });

  test("truncates slug to 50 chars", () => {
    const longTopic = "a".repeat(100);
    const t = new Transcript(TEST_DIR, longTopic);
    const slug = t.sessionId.replace(/^\d{8}-\d{6}-/, "");
    expect(slug.length).toBeLessThanOrEqual(50);
  });

  test("init creates directory", async () => {
    const t = new Transcript(TEST_DIR, "test");
    await t.init();
    const entries = await readdir(TEST_DIR);
    expect(entries).toBeDefined();
  });

  test("append writes JSONL events", async () => {
    const t = new Transcript(TEST_DIR, "test");
    await t.init();

    await t.append({
      type: "session_start",
      sessionId: t.sessionId,
      topic: "test",
      protocol: "round-robin",
      timestamp: 1000,
    });
    await t.append({
      type: "round_start",
      round: 1,
      label: "Initial",
      timestamp: 2000,
    });

    const content = await readFile(
      join(TEST_DIR, `${t.baseName}.jsonl`),
      "utf-8",
    );
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);

    const event1 = JSON.parse(lines[0] ?? "");
    expect(event1.type).toBe("session_start");
    expect(event1.topic).toBe("test");

    const event2 = JSON.parse(lines[1] ?? "");
    expect(event2.type).toBe("round_start");
    expect(event2.round).toBe(1);
  });
});
