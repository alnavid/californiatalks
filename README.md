# California Talks

Public opinion research and polling services for California campaigns, agencies, and ballot measure teams.

## Live Website

Visit: [www.californiatalks.org](https://www.californiatalks.org)

## Tech Stack

- Static HTML, CSS, and JavaScript
- Formsubmit.co for inquiry form delivery
- Cloudflare Worker with Static Assets

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
├── public/             # Static assets published by the Cloudflare Worker
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── assets/
├── render.yaml         # Legacy inactive Render configuration
├── wrangler.jsonc      # Active Cloudflare Worker deployment configuration
└── README.md
```

## Contact

California Talks  
ali@californiatalks.org
[californiatalks.org](https://www.californiatalks.org)
