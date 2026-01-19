import { describe, expect, it } from "vitest";
import app from "../index";

describe("API Health Check", () => {
  it("should return health status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({ status: "ok" });
  });

  it("should return welcome message on root", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({ message: "Music Explorer API" });
  });
});

describe("Search API", () => {
  it("should return 400 for short query", async () => {
    const res = await app.request("/api/search?q=a");
    expect(res.status).toBe(400);
  });

  it("should return 400 for missing query", async () => {
    const res = await app.request("/api/search");
    expect(res.status).toBe(400);
  });
});

describe("Graph API", () => {
  it("should return 400 for missing artistId", async () => {
    const res = await app.request("/api/graph");
    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid depth", async () => {
    const res = await app.request("/api/graph?artistId=test&depth=10");
    expect(res.status).toBe(400);
  });
});
