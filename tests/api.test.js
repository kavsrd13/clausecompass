import { test } from "node:test";
import assert from "node:assert/strict";
import { createAnalyzeHandler } from "../api/analyze.js";
const input = {
  text: "Payment is due 30 days after invoice approval.",
  role: "Client",
};
const config = () => ({ apiKey: "test-only", accessToken: "test-only" });
function response() {
  return {
    code: 200,
    body: null,
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
const request = (body = input) => ({
  method: "POST",
  headers: { host: "example.com", authorization: "Bearer test-only" },
  body,
});
const valid = {
  summary: "Payment depends on approval.",
  findings: [
    {
      title: "Payment",
      explanation: "30 days follows approval.",
      quote: "30 days after invoice approval.",
      document: "original",
    },
  ],
  questions: ["Who approves the invoice?"],
};
const generated = (value = valid, finishReason = "STOP") => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [
      { finishReason, content: { parts: [{ text: JSON.stringify(value) }] } },
    ],
  }),
});
async function invoke(req = request(), options = {}) {
  const res = response();
  await createAnalyzeHandler({
    config,
    fetcher: async () => generated(),
    ...options,
  })(req, res);
  return res;
}
test("reject methods before provider access", async () => {
  const res = await invoke({ ...request(), method: "GET" });
  assert.equal(res.code, 405);
  assert.equal(res.headers.Allow, "POST");
});
for (const origin of ["bad", "https://evil.example", "null"])
  test(`reject origin ${origin}`, async () => {
    assert.equal(
      (
        await invoke({
          ...request(),
          headers: { ...request().headers, origin },
        })
      ).code,
      403,
    );
  });
test("allow matching origin", async () =>
  assert.equal(
    (
      await invoke({
        ...request(),
        headers: { ...request().headers, origin: "https://example.com" },
      })
    ).code,
    200,
  ));
test("missing configuration returns 503", async () =>
  assert.equal((await invoke(request(), { config: () => ({}) })).code, 503));
test("incorrect or missing token returns 401", async () => {
  for (const authorization of [undefined, "Bearer wrong", ""])
    assert.equal(
      (
        await invoke({
          ...request(),
          headers: { host: "example.com", authorization },
        })
      ).code,
      401,
    );
});
test("invalid and whitespace-only documents never call provider", async () => {
  for (const text of ["bad", " ".repeat(50), "a".repeat(80001)]) {
    const res = await invoke(request({ ...input, text }), {
      fetcher: async () => {
        assert.fail("Provider should not be called");
      },
    });
    assert.equal(res.code, 400);
  }
});
test("provider quota returns 429", async () =>
  assert.equal(
    (
      await invoke(request(), {
        fetcher: async () => ({ ok: false, status: 429 }),
      })
    ).code,
    429,
  ));
test("provider failure is sanitized", async () => {
  const res = await invoke(request(), {
    fetcher: async () => {
      throw Error("private internal information");
    },
  });
  assert.equal(res.code, 502);
  assert.ok(!JSON.stringify(res.body).includes("private internal"));
});
for (const reason of ["MAX_TOKENS", "SAFETY", undefined])
  test(`incomplete generation ${reason} returns 502`, async () =>
    assert.equal(
      (
        await invoke(request(), {
          fetcher: async () =>
            generated(valid, reason === undefined ? null : reason),
        })
      ).code,
      502,
    ));
test("invalid JSON returns 502", async () =>
  assert.equal(
    (
      await invoke(request(), {
        fetcher: async () => ({
          ok: true,
          json: async () => ({
            candidates: [
              {
                finishReason: "STOP",
                content: { parts: [{ text: "not json" }] },
              },
            ],
          }),
        }),
      })
    ).code,
    502,
  ));
test("valid source result is complete and never cached", async () => {
  const res = await invoke();
  assert.equal(res.code, 200);
  assert.equal(res.body.incomplete, false);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.equal(res.body.findings.length, 1);
});
test("incorrect document references are omitted and marked incomplete", async () => {
  const value = {
    ...valid,
    findings: [
      ...valid.findings,
      { ...valid.findings[0], document: "revised" },
    ],
  };
  const res = await invoke(request(), {
    fetcher: async () => generated(value),
  });
  assert.equal(res.body.findings.length, 1);
  assert.equal(res.body.incomplete, true);
});
test("question is distinct from untrusted document and uses configured model", async () => {
  await invoke(request({ ...input, question: "When is payment due?" }), {
    config: () => ({ ...config(), model: "configured-model" }),
    fetcher: async (url, options) => {
      assert.match(url, /configured-model:generateContent/);
      const payload = JSON.parse(options.body);
      assert.match(payload.contents[0].parts[1].text, /When is payment due/);
      assert.equal(
        JSON.parse(payload.contents[0].parts[0].text).original,
        input.text,
      );
      return generated();
    },
  });
});
