import { describe, expect, test } from "bun:test";
import { withRetry } from "@/lib/retry.ts";

describe("withRetry", () => {
  test("returns result on first success", async () => {
    const result = await withRetry(() => Promise.resolve("ok"));
    expect(result).toBe("ok");
  });

  test("retries on 429 and succeeds", async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 3) {
        const error = new Error("Rate limited");
        (error as unknown as { status: number }).status = 429;
        throw error;
      }
      return "ok";
    });
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  test("retries on 500 and succeeds", async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 2) {
        const error = new Error("Internal server error");
        (error as unknown as { status: number }).status = 500;
        throw error;
      }
      return "ok";
    });
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  test("retries on timeout error", async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error("Request timeout");
      }
      return "ok";
    });
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  test("retries on network error", async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error("fetch failed");
      }
      return "ok";
    });
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  test("throws immediately on non-retryable error", async () => {
    let attempts = 0;
    await expect(
      withRetry(async () => {
        attempts++;
        throw new Error("Invalid API key");
      }),
    ).rejects.toThrow("Invalid API key");
    expect(attempts).toBe(1);
  });

  test("throws immediately on 400 status", async () => {
    let attempts = 0;
    await expect(
      withRetry(async () => {
        attempts++;
        const error = new Error("Bad request");
        (error as unknown as { status: number }).status = 400;
        throw error;
      }),
    ).rejects.toThrow("Bad request");
    expect(attempts).toBe(1);
  });

  test("throws after max attempts exhausted", async () => {
    let attempts = 0;
    await expect(
      withRetry(async () => {
        attempts++;
        const error = new Error("Rate limited");
        (error as unknown as { status: number }).status = 429;
        throw error;
      }, 3),
    ).rejects.toThrow("Rate limited");
    expect(attempts).toBe(3);
  });

  test("respects custom maxAttempts", async () => {
    let attempts = 0;
    await expect(
      withRetry(async () => {
        attempts++;
        const error = new Error("Server error");
        (error as unknown as { status: number }).status = 500;
        throw error;
      }, 2),
    ).rejects.toThrow("Server error");
    expect(attempts).toBe(2);
  });
});
