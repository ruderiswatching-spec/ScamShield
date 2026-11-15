import assert from "node:assert/strict";
import test from "node:test";
import vercelHandler from "./api/analyze.js";
import handler, { readJsonRequest } from "./server.js";

test("reads a JSON body already parsed by Vercel", async () => {
    const body = { text: "Check this message", files: [] };
    assert.deepEqual(await readJsonRequest({ body }), body);
});

test("reads a JSON string body from a serverless request", async () => {
    const body = { text: "Check this message", files: [] };
    assert.deepEqual(await readJsonRequest({ body: JSON.stringify(body) }), body);
});

test("rejects oversized parsed Vercel request bodies", async () => {
    await assert.rejects(
        readJsonRequest({ body: { text: "a".repeat(4 * 1024 * 1024), files: [] } }),
        { status: 413 }
    );
});

test("exports a request handler that serves the main page", async () => {
    const response = {
        headers: {},
        statusCode: 0,
        body: "",
        writeHead(statusCode, headers) {
            this.statusCode = statusCode;
            this.headers = headers;
        },
        end(body) {
            this.body = body;
        }
    };

    await handler({ method: "GET", url: "/", headers: {} }, response);

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["Content-Type"], /text\/html/);
    assert.match(response.body.toString(), /ScamShield/);
});

test("routes Vercel analysis requests at both supported paths", async () => {
    for (const url of ["/api/analyze", "/analyze"]) {
        const response = {
            headers: {},
            statusCode: 0,
            writeHead(statusCode, headers) {
                this.statusCode = statusCode;
                this.headers = headers;
            },
            end() {}
        };

        await vercelHandler({
            method: "POST",
            url,
            headers: { "content-type": "text/plain" }
        }, response);

        assert.ok([415, 503].includes(response.statusCode), `${url} was not routed`);
    }
});
