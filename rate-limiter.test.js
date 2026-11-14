import assert from "node:assert/strict";
import test from "node:test";
import { RequestRateLimiter } from "./rate-limiter.js";

test("allows three requests in a rolling minute and reports the expiry", () => {
    const limiter = new RequestRateLimiter();
    const start = Date.UTC(2026, 10, 13, 12);

    assert.equal(limiter.check("user", start), null);
    assert.equal(limiter.check("user", start + 10_000), null);
    assert.equal(limiter.check("user", start + 20_000), null);
    assert.deepEqual(limiter.check("user", start + 30_000), {
        limitType: "minute",
        retryAfterSeconds: 30
    });
    assert.equal(limiter.check("user", start + 60_000), null);
});

test("allows twenty requests per UTC day and resets at midnight", () => {
    const limiter = new RequestRateLimiter();
    const start = Date.UTC(2026, 10, 13, 0);

    for (let request = 0; request < 20; request += 1) {
        assert.equal(limiter.check("user", start + request * 60_000), null);
    }
    assert.deepEqual(limiter.check("user", start + 20 * 60_000), {
        limitType: "daily",
        retryAfterSeconds: 23 * 60 * 60 + 40 * 60
    });
    assert.equal(limiter.check("user", Date.UTC(2026, 10, 14)), null);
});

test("keeps request limits separate per client address", () => {
    const limiter = new RequestRateLimiter();
    const now = Date.UTC(2026, 10, 13, 12);

    for (let request = 0; request < 3; request += 1) {
        assert.equal(limiter.check("user-a", now), null);
    }
    assert.equal(limiter.check("user-b", now), null);
});
