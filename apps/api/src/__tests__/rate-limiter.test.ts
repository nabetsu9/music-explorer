import { describe, expect, it } from "vitest";
import { RateLimiter } from "../collectors/rate-limiter";

describe("RateLimiter", () => {
  it("should wait between requests", async () => {
    const limiter = new RateLimiter(2); // 2 req/sec = 500ms interval
    const start = Date.now();

    await limiter.wait();
    await limiter.wait();

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(450); // Allow some tolerance
  });

  it("should not wait on first request", async () => {
    const limiter = new RateLimiter(1);
    const start = Date.now();

    await limiter.wait();

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it("should respect different rates", async () => {
    const limiter = new RateLimiter(10); // 10 req/sec = 100ms interval
    const start = Date.now();

    await limiter.wait();
    await limiter.wait();

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(90);
    expect(elapsed).toBeLessThan(200);
  });
});
