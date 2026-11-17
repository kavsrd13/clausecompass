import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "../api/analyze.js";
function response() {
  return {
    code: 200,
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
const req = () => ({
  method: "POST",
  headers: { host: "example.com", authorization: "Bearer test-only" },
  body: {
    text: "Payment is due 30 days after invoice approval.",
    role: "Client",
  },
});
test("reject non-POST requests", async () => {
  const r = response();
  await handler({ ...req(), method: "GET" }, r);
  assert.equal(r.code, 405);
});
test("reject malformed and foreign origins", async () => {
  for (const origin of ["bad", "https://evil.example"]) {
    const r = response();
    await handler({ ...req(), headers: { host: "example.com", origin } }, r);
    assert.equal(r.code, 403);
  }
});
test("server configuration and token gate", async () => {
  const old = process.env.GEMINI_API_KEY;
  const token = process.env.APP_ACCESS_TOKEN;
  try {
    delete process.env.GEMINI_API_KEY;
    let r = response();
    await handler(req(), r);
    assert.equal(r.code, 503);
    process.env.GEMINI_API_KEY = "test-only";
    process.env.APP_ACCESS_TOKEN = "different";
    r = response();
    await handler(req(), r);
    assert.equal(r.code, 401);
  } finally {
    if (old === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = old;
    if (token === undefined) delete process.env.APP_ACCESS_TOKEN;
    else process.env.APP_ACCESS_TOKEN = token;
  }
});
test("validate input, provider failures and exact evidence", async () => {
  const oldKey = process.env.GEMINI_API_KEY,
    oldToken = process.env.APP_ACCESS_TOKEN,
    oldFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-only";
  process.env.APP_ACCESS_TOKEN = "test-only";
  try {
    let r = response();
    await handler({ ...req(), body: { text: "bad" } }, r);
    assert.equal(r.code, 400);
    globalThis.fetch = async () => ({ ok: false, status: 429 });
    r = response();
    await handler(req(), r);
    assert.equal(r.code, 429);
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: "Payment depends on approval.",
                    findings: [
                      {
                        title: "Payment",
                        explanation: "30 day period follows approval",
                        quote: "30 days after invoice approval.",
                        document: "original",
                      },
                      {
                        title: "Unsupported",
                        explanation: "Invented",
                        quote: "invented clause",
                        document: "original",
                      },
                    ],
                    questions: ["When is approval confirmed?"],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    r = response();
    await handler(req(), r);
    assert.equal(r.code, 200);
    assert.equal(r.body.findings.length, 1);
    assert.equal(r.body.incomplete, true);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
    if (oldToken === undefined) delete process.env.APP_ACCESS_TOKEN;
    else process.env.APP_ACCESS_TOKEN = oldToken;
  }
});
