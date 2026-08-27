# California Talks Newsletter and Brevo Rollout

_Implementation record: August 20, 2026_

## Current status

The California Talks newsletter signup is live at
`https://californiatalks.org/#newsletter`. The production Cloudflare Worker
uses Brevo for email delivery and subscriber management. It no longer calls
SendGrid, and the obsolete SendGrid secret was removed from this Worker.
Separate Phillip Chen email systems were not changed.

This document intentionally records no API keys, DNS verification values, or
other credentials. Production secrets live only in Cloudflare.

## Decision history

1. The initial implementation used an isolated SendGrid subuser and added
   domain authentication, branded links, double opt-in, and a one-recipient
   affordability-newsletter test.
2. Authentication passed, but the test reached Gmail spam. The available
   SendGrid dedicated IPs also belonged to the separate Chen campaign and had
   unsuitable reputation history for a new California Talks list.
3. We compared lower-cost API-capable newsletter systems and selected Brevo
   Starter for its conventional campaign interface, contact and campaign APIs,
   shared sending infrastructure, and 5,000-email allowance.
4. The Worker and newsletter campaign were migrated to Brevo. The California
   Talks SendGrid Worker secret was then removed.

## Production subscription flow

1. The homepage form posts email, optional first name, honeypot value, and a
   Turnstile response to `POST /api/subscribe`.
2. The Worker validates request origin, body size, address format, Turnstile
   hostname/action, and KV-backed IP/email cooldowns.
3. A cryptographically random token is stored in the
   `NEWSLETTER_PENDING` Cloudflare KV namespace for seven days. The pending
   record contains the normalized email, optional first name, request time,
   and privacy-policy version.
4. The Worker calls Brevo `POST /v3/smtp/email` to send the confirmation email
   from the configured California Talks sender.
5. The confirmation link opens a landing page; the visitor completes
   `POST /api/confirm` rather than being subscribed by an email-scanner GET.
6. The Worker consumes the one-time KV token and calls Brevo
   `POST /v3/contacts` with `updateEnabled: true`, the newsletter list ID, and
   explicit consent metadata.
7. The visitor is redirected to the subscription-confirmed page. Invalid or
   expired links go to the expired-link page.

The stored Brevo attributes are:

- `FIRSTNAME`
- `OPT_IN`
- `CT_SOURCE`
- `CT_CONSENT_AT`
- `CT_CONSENT_METHOD`
- `CT_PRIVACY_VERSION`

## Brevo configuration verified during rollout

- Plan: Starter, 5,000 email credits at verification time.
- Sender: the configured California Talks sender identity.
- List: `California Talks Newsletter`.
- Sending domain: `californiatalks.org`.
- Authentication: ownership verification, both Brevo DKIM records, and DMARC
  all passed.
- Test campaign: California Affordability Snapshot, campaign ID 1.
- Test result: one authorized internal recipient, one sent, one delivered,
  zero soft bounces, zero hard bounces, and one reported view.

At this list size, California Talks uses Brevo's shared delivery
infrastructure. A dedicated IP is neither required nor desirable.

## Cloudflare configuration

The Worker is named `californiatalks` and serves the static files in `public/`.
Worker execution is forced for `/api/*`. Configuration in `wrangler.jsonc`
includes the public origin/hostname allowlists, sender name, Brevo list ID,
privacy version, and the `NEWSLETTER_PENDING` KV binding. Sender and form-routing
email addresses are stored as Worker secrets so they are not exposed in source.

The required production secrets are:

- `BREVO_API_KEY`
- `CONTACT_TO_EMAIL`
- `BREVO_SENDER_EMAIL`
- `TURNSTILE_SECRET_KEY`

The API key is never returned to the browser. The old `SENDGRID_API_KEY`
binding was deleted from the California Talks Worker after migration.

## Website changes

- Added the homepage newsletter section and client-side submission handling.
- Added Turnstile, honeypot, cooldown, and non-enumerating response behavior.
- Added confirmation, confirmed, and expired-link pages.
- Updated the Privacy Policy for newsletter collection, retention,
  service-provider processing, and unsubscribe rights.
- Added the California Talks physical mailing address and Brevo unsubscribe
  placeholder to the affordability newsletter.
- Standardized every public page's primary navigation to this exact order:
  Services, Proof, Newsletter, Contact, SMS Consent, Privacy.
- Removed District Explorer from the primary navigation. The explorer content
  itself remains available on the homepage.

## Relevant files

- `src/index.js` — subscription, confirmation, Turnstile, KV, and Brevo API.
- `wrangler.jsonc` — Worker, asset, KV, and non-secret environment bindings.
- `public/index.html` — newsletter signup form.
- `public/script.js` — asynchronous signup form behavior.
- `public/styles.css` — newsletter and confirmation-page presentation.
- `public/newsletter-confirm.html` — scanner-safe confirmation landing page.
- `public/newsletter-confirmed.html` — successful confirmation page.
- `public/newsletter-link-expired.html` — invalid/expired token page.
- `public/privacy.html` — newsletter privacy disclosures.
- `newsletter/affordability-snapshot-aug2026-california-talks.html` — reusable
  California Talks newsletter HTML with Brevo unsubscribe handling.
- `newsletter/send-brevo-test.mjs` — fail-closed, one-recipient test utility.
- `test/newsletter-worker.test.js` — Worker and navigation regression tests.

## Verification completed

- Worker unit/regression suite: six passing tests.
- Wrangler production bundle: successful dry run.
- Live homepage, Privacy, SMS Consent, and all three confirmation routes: HTTP
  success and identical six-link primary navigation.
- Invalid confirmation token: redirects to the expired-link page.
- Explicit foreign confirmation origin: rejected with HTTP 403.
- Brevo sending domain: verified and authenticated.
- Brevo campaign report: one sent and one delivered with no bounces.

## Operating commands

Run local verification:

```powershell
npm test
npx wrangler deploy --dry-run
```

Run the retained one-recipient campaign proof only when Brevo list 2 contains
exactly the intended internal recipient:

```powershell
$env:BREVO_API_KEY = "<read from the approved secret source>"
$env:BREVO_SENDER_EMAIL = "<read from the approved sender configuration>"
node newsletter/send-brevo-test.mjs "recipient@example.com"
```

The utility refuses to send unless the audience is exactly one address and
reuses its named campaign to prevent an accidental duplicate.

## Maintenance notes

- Use Brevo campaigns, not the transactional endpoint, for bulk newsletters so
  campaign unsubscribe and reporting behavior remains intact.
- Confirmation email is transactional; a contact is added to the marketing
  list only after the confirmation POST succeeds.
- Keep the physical address and `{{ unsubscribe }}` link in every marketing
  newsletter.
- Do not add the separate Chen campaign audience to the California Talks list.
- When adding a public HTML page, the navigation regression test requires the
  standard six-link header.
