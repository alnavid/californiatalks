const BREVO_API = "https://api.brevo.com/v3";
const TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const PENDING_TTL_SECONDS = 7 * 24 * 60 * 60;
const EMAIL_COOLDOWN_SECONDS = 5 * 60;
const IP_COOLDOWN_SECONDS = 10;
const KV_MINIMUM_TTL_SECONDS = 60;
const MAX_BODY_BYTES = 16 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
const TOKEN_RE = /^[A-Za-z0-9_-]{40,64}$/u;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/subscribe") {
        if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
        return await subscribe(request, env);
      }

      if (url.pathname === "/api/confirm") {
        if (request.method === "GET") return confirmationLanding(url, env);
        if (request.method === "POST") return await confirm(request, env);
        return json({ error: "Method not allowed" }, 405);
      }

      if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("newsletter_request_failed", error instanceof Error ? error.message : error);
      if (url.pathname === "/api/confirm") {
        const token = url.searchParams.get("token") || "";
        return confirmRedirect(env, token, true);
      }
      return json({ error: "We could not process your request. Please try again." }, 500);
    }
  },
};

async function subscribe(request, env) {
  requireConfiguration(env);
  if (!isAllowedOrigin(request, env)) return json({ error: "Forbidden" }, 403);
  enforceBodyLimit(request);

  const body = await readBody(request);
  if (body.website) return subscriptionAccepted();

  const email = normalizeEmail(body.email);
  const firstName = cleanName(body.first_name);
  if (!email) return json({ error: "Please enter a valid email address." }, 400);

  const human = await verifyTurnstile(
    String(body["cf-turnstile-response"] || ""),
    request.headers.get("CF-Connecting-IP") || "",
    env,
  );
  if (!human) return json({ error: "Verification failed. Please try again." }, 400);

  const ipHash = await sha256(request.headers.get("CF-Connecting-IP") || "unknown");
  const emailHash = await sha256(email);
  const ipRateKey = `rate:ip:${ipHash}`;
  const emailRateKey = `rate:email:${emailHash}`;

  const ipBlockedUntil = Number(await env.NEWSLETTER_PENDING.get(ipRateKey) || 0);
  if (ipBlockedUntil > Date.now()) {
    return json({ error: "Please wait a moment and try again." }, 429);
  }
  if (await env.NEWSLETTER_PENDING.get(emailRateKey)) return subscriptionAccepted();

  await Promise.all([
    env.NEWSLETTER_PENDING.put(ipRateKey, String(Date.now() + IP_COOLDOWN_SECONDS * 1000), {
      expirationTtl: KV_MINIMUM_TTL_SECONDS,
    }),
    env.NEWSLETTER_PENDING.put(emailRateKey, "1", { expirationTtl: EMAIL_COOLDOWN_SECONDS }),
  ]);

  const token = randomToken();
  const pendingKey = `pending:${token}`;
  const requestedAt = new Date().toISOString();
  await env.NEWSLETTER_PENDING.put(
    pendingKey,
    JSON.stringify({ email, firstName, requestedAt, privacyVersion: env.PRIVACY_VERSION }),
    { expirationTtl: PENDING_TTL_SECONDS },
  );

  try {
    await sendConfirmation(email, firstName, token, env);
  } catch (error) {
    await Promise.all([
      env.NEWSLETTER_PENDING.delete(pendingKey),
      env.NEWSLETTER_PENDING.delete(emailRateKey),
    ]);
    throw error;
  }

  return subscriptionAccepted();
}

function confirmationLanding(url, env) {
  const token = url.searchParams.get("token") || "";
  if (!TOKEN_RE.test(token)) return expiredRedirect(env);
  return Response.redirect(
    `${env.SITE_URL}/newsletter-confirm.html?token=${encodeURIComponent(token)}`,
    303,
  );
}

async function confirm(request, env) {
  requireConfiguration(env);
  if (!isAllowedOrigin(request, env, true)) return json({ error: "Forbidden" }, 403);
  enforceBodyLimit(request);

  const body = await readBody(request);
  const token = String(body.token || "");
  if (!TOKEN_RE.test(token)) return expiredRedirect(env);

  const pendingKey = `pending:${token}`;
  const rawPending = await env.NEWSLETTER_PENDING.get(pendingKey);
  if (!rawPending) return expiredRedirect(env);

  let pending;
  try {
    pending = JSON.parse(rawPending);
  } catch {
    await env.NEWSLETTER_PENDING.delete(pendingKey);
    return expiredRedirect(env);
  }

  const email = normalizeEmail(pending.email);
  if (!email) {
    await env.NEWSLETTER_PENDING.delete(pendingKey);
    return expiredRedirect(env);
  }

  try {
    await upsertContact(email, cleanName(pending.firstName), pending.privacyVersion, env);
    await env.NEWSLETTER_PENDING.delete(pendingKey);
    return Response.redirect(`${env.SITE_URL}/newsletter-confirmed.html`, 303);
  } catch (error) {
    console.error("newsletter_confirmation_failed", error instanceof Error ? error.message : error);
    return confirmRedirect(env, token, true);
  }
}

async function sendConfirmation(email, firstName, token, env) {
  const link = `${env.SITE_URL}/api/confirm?token=${encodeURIComponent(token)}`;
  const greetingText = firstName ? `Hi ${firstName},` : "Hello,";
  const greetingHtml = firstName ? `Hi ${escapeHtml(firstName)},` : "Hello,";
  const addressText = "California Talks LLC · 2500 E. Imperial Hwy, Ste 149A-268 · Brea, CA 92821";

  await brevoRequest("/smtp/email", env, {
    method: "POST",
    body: {
      sender: { email: env.FROM_EMAIL, name: env.FROM_NAME },
      to: [{ email, ...(firstName ? { name: firstName } : {}) }],
      replyTo: { email: env.FROM_EMAIL, name: env.FROM_NAME },
      subject: "Confirm your California Talks newsletter subscription",
      textContent: `${greetingText}\n\nConfirm your subscription to the California Talks newsletter:\n${link}\n\nIf you did not request this, ignore this email and you will not be subscribed.\n\n${addressText}`,
      htmlContent: `<p>${greetingHtml}</p><p>Please confirm your subscription to the California Talks newsletter:</p><p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#164b73;color:#fff;border-radius:6px;text-decoration:none;font-weight:700">Confirm subscription</a></p><p style="color:#5e6975">If you did not request this, ignore this email and you will not be subscribed.</p><p style="color:#5e6975">California Talks LLC &middot; 2500 E. Imperial Hwy, Ste 149A-268 &middot; Brea, CA 92821</p>`,
      tags: ["newsletter-confirm"],
    },
    acceptedStatuses: [201],
  });
}

async function upsertContact(email, firstName, privacyVersion, env) {
  const listId = Number(env.BREVO_LIST_ID);
  if (!Number.isInteger(listId) || listId <= 0) throw new Error("Invalid Brevo list ID");

  const attributes = {
    OPT_IN: true,
    CT_SOURCE: "website",
    CT_CONSENT_AT: new Date().toISOString(),
    CT_CONSENT_METHOD: "double_opt_in",
    CT_PRIVACY_VERSION: privacyVersion || env.PRIVACY_VERSION,
  };
  if (firstName) attributes.FIRSTNAME = firstName;

  await brevoRequest("/contacts", env, {
    method: "POST",
    body: {
      email,
      attributes,
      listIds: [listId],
      emailBlacklisted: false,
      updateEnabled: true,
    },
    acceptedStatuses: [201, 204],
  });
}

async function verifyTurnstile(token, ip, env) {
  if (!env.TURNSTILE_SECRET_KEY || !token || token.length > 2048) return false;
  const payload = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  if (ip) payload.set("remoteip", ip);

  const response = await fetchWithTimeout(TURNSTILE_VERIFY, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload,
  });
  if (!response.ok) return false;

  const result = await response.json();
  const hostnames = csvSet(env.TURNSTILE_HOSTNAMES);
  return (
    result.success === true &&
    hostnames.has(result.hostname) &&
    result.action === env.TURNSTILE_ACTION
  );
}

async function brevoRequest(path, env, options) {
  const response = await fetchWithTimeout(`${BREVO_API}${path}`, {
    method: options.method,
    headers: {
      "api-key": env.BREVO_API_KEY,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!options.acceptedStatuses.includes(response.status)) {
    const requestId = response.headers.get("x-request-id") || "none";
    throw new Error(`Brevo ${path} returned ${response.status}; request_id=${requestId}`);
  }
  return response;
}

async function fetchWithTimeout(url, options, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function requireConfiguration(env) {
  const required = [
    "ASSETS",
    "NEWSLETTER_PENDING",
    "BREVO_API_KEY",
    "BREVO_LIST_ID",
    "TURNSTILE_SECRET_KEY",
    "TURNSTILE_HOSTNAMES",
    "TURNSTILE_ACTION",
    "SITE_URL",
    "FROM_EMAIL",
    "FROM_NAME",
    "PRIVACY_VERSION",
  ];
  const missing = required.filter((name) => !env[name]);
  if (missing.length) throw new Error(`Missing Worker configuration: ${missing.join(",")}`);
}

function isAllowedOrigin(request, env, allowMissing = false) {
  const origin = request.headers.get("Origin") || "";
  if (!origin) return allowMissing;
  return csvSet(env.ALLOWED_ORIGINS).has(origin);
}

function enforceBodyLimit(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY_BYTES) throw new Error("Request body too large");
}

async function readBody(request) {
  const type = request.headers.get("Content-Type") || "";
  if (type.includes("application/json")) return request.json();
  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return "";
  return email;
}

function cleanName(value) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 80);
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64url(new Uint8Array(digest));
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/gu, "");
}

function csvSet(value) {
  return new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function subscriptionAccepted() {
  return json({ ok: true, mode: "confirm" });
}

function expiredRedirect(env) {
  return Response.redirect(`${env.SITE_URL}/newsletter-link-expired.html`, 303);
}

function confirmRedirect(env, token, error) {
  const query = new URLSearchParams({ token });
  if (error) query.set("error", "1");
  return Response.redirect(`${env.SITE_URL}/newsletter-confirm.html?${query}`, 303);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export { cleanName, normalizeEmail, randomToken, sha256 };
