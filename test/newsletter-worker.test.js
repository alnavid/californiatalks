import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import worker, { cleanName, normalizeEmail, normalizePhone, randomToken } from "../src/index.js";

const STANDARD_NAVIGATION = [
  ["/#services", "Services"],
  ["/#proof", "Proof"],
  ["/#newsletter", "Newsletter"],
  ["/#contact", "Contact"],
  ["/sms-consent.html", "SMS Consent"],
  ["/privacy.html", "Privacy"],
];

class MemoryKv {
  constructor() {
    this.values = new Map();
  }

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async put(key, value) {
    this.values.set(key, value);
  }

  async delete(key) {
    this.values.delete(key);
  }
}

function environment(kv = new MemoryKv()) {
  return {
    ASSETS: { fetch: async () => new Response("asset") },
    NEWSLETTER_PENDING: kv,
    BREVO_API_KEY: "test-key",
    BREVO_LIST_ID: "2",
    TURNSTILE_SECRET_KEY: "turnstile-secret",
    TURNSTILE_HOSTNAMES: "www.californiatalks.org,californiatalks.org",
    TURNSTILE_ACTION: "newsletter-signup",
    ALLOWED_ORIGINS: "https://www.californiatalks.org,https://californiatalks.org",
    SITE_URL: "https://www.californiatalks.org",
    CONTACT_TO_EMAIL: "recipient@example.com",
    BREVO_SENDER_EMAIL: "sender@example.com",
    FROM_NAME: "California Talks",
    PRIVACY_VERSION: "2026-08-26",
  };
}

function formRequest(path, fields, origin = "https://www.californiatalks.org") {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  const headers = { "CF-Connecting-IP": "203.0.113.10" };
  if (origin) headers.Origin = origin;
  return new Request(`https://www.californiatalks.org${path}`, {
    method: "POST",
    headers,
    body: form,
  });
}

test("normalizes email and cleans names", () => {
  assert.equal(normalizeEmail("  Person@Example.COM "), "person@example.com");
  assert.equal(normalizeEmail("not-an-email"), "");
  assert.equal(cleanName("  Ali\n  Navid  "), "Ali Navid");
  assert.equal(normalizePhone("(714) 555-0123"), "(714) 555-0123");
  assert.equal(normalizePhone("123"), "");
  assert.match(randomToken(), /^[A-Za-z0-9_-]{43}$/u);
});

test("every public HTML page uses the standard primary navigation", () => {
  const publicDirectory = new URL("../public/", import.meta.url);
  const htmlFiles = fs.readdirSync(publicDirectory).filter((name) => name.endsWith(".html"));

  for (const name of htmlFiles) {
    const html = fs.readFileSync(new URL(name, publicDirectory), "utf8");
    const navigation = html.match(/<nav class="main-nav" aria-label="Primary navigation">([\s\S]*?)<\/nav>/u);
    assert.ok(navigation, `${name} is missing the primary navigation`);

    const links = [...navigation[1].matchAll(/<a href="([^"]+)">([^<]+)<\/a>/gu)]
      .map((match) => [match[1], match[2]]);
    assert.deepEqual(links, STANDARD_NAVIGATION, `${name} has nonstandard primary navigation`);
  }
});

test("public assets do not expose direct email links and forms use Worker endpoints", () => {
  const publicDirectory = new URL("../public/", import.meta.url);
  const publicFiles = fs.readdirSync(publicDirectory)
    .filter((name) => name.endsWith(".html") || name.endsWith(".js"));
  const source = publicFiles
    .map((name) => fs.readFileSync(new URL(name, publicDirectory), "utf8"))
    .join("\n");

  assert.doesNotMatch(source, /mailto:/iu);

  const homepage = fs.readFileSync(new URL("index.html", publicDirectory), "utf8");
  const smsConsent = fs.readFileSync(new URL("sms-consent.html", publicDirectory), "utf8");
  assert.match(homepage, /class="contact-form" action="\/api\/contact"/u);
  assert.match(smsConsent, /class="consent-form" action="\/api\/sms-opt-in"/u);
});

test("contact form validates and delivers through the private Worker route", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(null, { status: 201 });
  };

  try {
    const response = await worker.fetch(
      formRequest("/api/contact", {
        name: "Person",
        email: "person@example.com",
        project_type: "Likely voter poll",
        geography: "Orange County",
        message: "We need a benchmark survey.",
      }),
      environment(),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });

    const payload = JSON.parse(calls[0].options.body);
    assert.equal(payload.to[0].email, "recipient@example.com");
    assert.equal(payload.replyTo.email, "person@example.com");
    assert.match(payload.textContent, /Orange County/u);
    assert.deepEqual(payload.tags, ["website-contact"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("SMS opt-in validates consent and delivers through the private Worker route", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(null, { status: 201 });
  };

  try {
    const rejected = await worker.fetch(
      formRequest("/api/sms-opt-in", { name: "Person", phone: "(714) 555-0123" }),
      environment(),
    );
    assert.equal(rejected.status, 400);

    const response = await worker.fetch(
      formRequest("/api/sms-opt-in", {
        name: "Person",
        phone: "(714) 555-0123",
        email: "person@example.com",
        zip: "92821",
        sms_consent: "yes",
        opt_in_source: "californiatalks.org/sms-consent.html",
      }),
      environment(),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });

    const payload = JSON.parse(calls[0].options.body);
    assert.equal(payload.to[0].email, "recipient@example.com");
    assert.match(payload.textContent, /SMS consent: yes/u);
    assert.deepEqual(payload.tags, ["website-sms-opt-in"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("confirmation GET does not consume or inspect pending state", async () => {
  const kv = new MemoryKv();
  const token = randomToken();
  await kv.put(`pending:${token}`, JSON.stringify({ email: "person@example.com" }));
  const response = await worker.fetch(
    new Request(`https://www.californiatalks.org/api/confirm?token=${token}`),
    environment(kv),
  );
  assert.equal(response.status, 303);
  assert.match(response.headers.get("location"), /newsletter-confirm\.html\?token=/u);
  assert.ok(await kv.get(`pending:${token}`));
});

test("subscribe stores an opaque pending token and sends confirmation without bypass", async () => {
  const originalFetch = globalThis.fetch;
  const kv = new MemoryKv();
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("turnstile")) {
      return Response.json({
        success: true,
        hostname: "www.californiatalks.org",
        action: "newsletter-signup",
      });
    }
    return new Response(null, { status: 201 });
  };

  try {
    const response = await worker.fetch(
      formRequest("/api/subscribe", {
        email: "person@example.com",
        first_name: "Person",
        "cf-turnstile-response": "valid-token",
      }),
      environment(kv),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, mode: "confirm" });

    const pendingKey = [...kv.values.keys()].find((key) => key.startsWith("pending:"));
    assert.ok(pendingKey);
    assert.doesNotMatch(pendingKey, /person|example/iu);

    const mailCall = calls.find((call) => call.url.endsWith("/smtp/email"));
    const payload = JSON.parse(mailCall.options.body);
    assert.equal(payload.sender.email, "sender@example.com");
    assert.match(payload.textContent, /Confirm your subscription/u);
    assert.match(payload.htmlContent, /Confirm subscription/u);
    assert.deepEqual(payload.tags, ["newsletter-confirm"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("confirmation POST opts in and upserts the Brevo contact", async () => {
  const originalFetch = globalThis.fetch;
  const kv = new MemoryKv();
  const token = randomToken();
  await kv.put(
    `pending:${token}`,
    JSON.stringify({
      email: "person@example.com",
      firstName: "Person",
      requestedAt: new Date().toISOString(),
      privacyVersion: "2026-08-20",
    }),
  );
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(null, { status: 201 });
  };

  try {
    const response = await worker.fetch(
      formRequest("/api/confirm", { token }),
      environment(kv),
    );
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "https://www.californiatalks.org/newsletter-confirmed.html");
    assert.equal(await kv.get(`pending:${token}`), null);

    const contactCall = calls.find((call) => call.url.endsWith("/contacts"));
    const payload = JSON.parse(contactCall.options.body);
    assert.deepEqual(payload.listIds, [2]);
    assert.equal(payload.email, "person@example.com");
    assert.equal(payload.emailBlacklisted, false);
    assert.equal(payload.updateEnabled, true);
    assert.equal(payload.attributes.OPT_IN, true);
    assert.equal(payload.attributes.CT_CONSENT_METHOD, "double_opt_in");
    assert.match(payload.attributes.CT_CONSENT_AT, /^\d{4}-\d{2}-\d{2}T/u);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("confirmation accepts a missing Origin but rejects an explicit foreign Origin", async () => {
  const originalFetch = globalThis.fetch;
  const kv = new MemoryKv();
  const token = randomToken();
  await kv.put(
    `pending:${token}`,
    JSON.stringify({ email: "person@example.com", firstName: "Person", privacyVersion: "2026-08-20" }),
  );
  globalThis.fetch = async (_url, options) => {
    return new Response(null, { status: 201 });
  };

  try {
    const rejected = await worker.fetch(
      formRequest("/api/confirm", { token }, "https://example.com"),
      environment(kv),
    );
    assert.equal(rejected.status, 403);
    assert.ok(await kv.get(`pending:${token}`));

    const accepted = await worker.fetch(
      formRequest("/api/confirm", { token }, ""),
      environment(kv),
    );
    assert.equal(accepted.status, 303);
    assert.equal(accepted.headers.get("location"), "https://www.californiatalks.org/newsletter-confirmed.html");
    assert.equal(await kv.get(`pending:${token}`), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
