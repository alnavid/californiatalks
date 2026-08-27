# California Talks

Public opinion research and polling services for California campaigns, agencies, and ballot measure teams.

## Live Website

Visit: [www.californiatalks.org](https://www.californiatalks.org)

## Tech Stack

- Static HTML, CSS, and JavaScript
- Cloudflare Worker with Static Assets
- Cloudflare Turnstile and KV for newsletter double opt-in
- Brevo API for private form delivery, confirmation email, subscriber management, and campaigns

## Newsletter

The homepage newsletter form posts to `POST /api/subscribe` in the Cloudflare
Worker. After Turnstile verification, the Worker sends a confirmation message
through Brevo and stores an opaque, seven-day confirmation token in Cloudflare
KV. `POST /api/confirm` consumes that token and adds the confirmed address to
the Brevo newsletter list with consent metadata.

API credentials are Cloudflare Worker secrets and are never stored in this
repository. See [NEWSLETTER_IMPLEMENTATION.md](NEWSLETTER_IMPLEMENTATION.md)
for the architecture, rollout record, and operating notes.

## Production Deployment

Cloudflare's Git integration deploys the `public/` directory to the
`californiatalks` Worker. A merge or push to `main` triggers the production
deployment for `californiatalks.org` and `www.californiatalks.org`.
`wrangler.jsonc` defines the Worker name, compatibility date, and static-assets
directory used by both production and pull-request preview builds.

The checked-in `render.yaml` is a legacy configuration and is not the current
production hosting path.

## Local Preview

```bash
python app.py
```

Then open: [http://127.0.0.1:8000](http://127.0.0.1:8000)

## Project Structure

```text
californiatalks/
├── app.py              # Dependency-free local preview server
├── newsletter/         # Reusable California Talks newsletter HTML and test-send utility
├── public/             # Static assets published by the Cloudflare Worker
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── assets/
├── src/index.js        # Worker API for subscription and confirmation
├── test/               # Worker and navigation regression tests
├── render.yaml         # Legacy inactive Render configuration
├── wrangler.jsonc      # Active Cloudflare Worker deployment configuration
└── README.md
```

## Verification

```bash
npm test
npx wrangler deploy --dry-run
```

## Contact

Use the project-intake form at [californiatalks.org](https://www.californiatalks.org/#contact).
