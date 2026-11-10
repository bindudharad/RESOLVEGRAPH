import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { POST } from "@/app/api/auth/demo-login/route";
import { NextRequest } from "next/server";

describe("RESOLVEGRAPH 2.0: One-Click Demo Workspace Entry Suite", () => {
  it("authenticates PLATFORM workspace demo account securely", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/demo-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.1.1",
      },
      body: JSON.stringify({ workspace: "PLATFORM" }),
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.workspace, "PLATFORM");
    assert.equal(data.user.email, "admin@resolvegraph.demo");
    assert.equal(data.user.role, "ADMIN");
    assert.equal(data.user.isPlatformAdmin, true);

    const cookies = res.headers.get("set-cookie");
    assert.ok(cookies, "Expected Set-Cookie headers on demo authentication response");
    assert.ok(cookies.includes("better-auth.session_token"));
  });

  it("authenticates BUYER workspace demo account securely", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/demo-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.1.2",
      },
      body: JSON.stringify({ workspace: "BUYER" }),
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.workspace, "BUYER");
    assert.equal(data.user.email, "alex.morgan@consumer.demo");
    assert.equal(data.user.role, "BUYER");
    assert.equal(data.user.isPlatformAdmin, false);

    const cookies = res.headers.get("set-cookie");
    assert.ok(cookies, "Expected Set-Cookie headers on demo authentication response");
  });

  it("authenticates MERCHANT workspace demo account securely", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/demo-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.1.3",
      },
      body: JSON.stringify({ workspace: "MERCHANT" }),
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.workspace, "MERCHANT");
    assert.equal(data.user.email, "disputes@techstore.demo");
    assert.equal(data.user.role, "MERCHANT");
    assert.equal(data.user.isPlatformAdmin, false);

    const cookies = res.headers.get("set-cookie");
    assert.ok(cookies, "Expected Set-Cookie headers on demo authentication response");
  });

  it("rejects unauthorized arbitrary workspace identifiers", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/demo-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.1.4",
      },
      body: JSON.stringify({ workspace: "SUPER_ADMIN_HACK" }),
    });

    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.ok(data.error.includes("Invalid workspace"));
  });

  it("enforces sliding-window rate limiting on repeated requests from single IP", async () => {
    const testIp = "192.0.2.99";
    let lastStatus = 200;

    for (let i = 0; i < 18; i++) {
      const req = new NextRequest("http://localhost:3000/api/auth/demo-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": testIp,
        },
        body: JSON.stringify({ workspace: "BUYER" }),
      });
      const res = await POST(req);
      lastStatus = res.status;
      if (res.status === 429) break;
    }

    assert.equal(lastStatus, 429, "Expected rate limiter to return 429 Too Many Requests");
  });
});
