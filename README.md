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
├── public/             # Static website published by Render
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── assets/
├── render.yaml         # Legacy inactive Render configuration
└── README.md
```

## Contact

California Talks  
ali@californiatalks.org
[californiatalks.org](https://www.californiatalks.org)
