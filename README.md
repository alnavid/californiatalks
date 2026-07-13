# California Talks

Public opinion research and polling services for California campaigns, agencies, and ballot measure teams.

## Live Website

Visit: [www.californiatalks.org](https://www.californiatalks.org)

## Tech Stack

- Static HTML, CSS, and JavaScript
- Formsubmit.co for inquiry form delivery
- Render Static Site via `render.yaml`

## Local Preview

```bash
python app.py
```

Then open: [http://127.0.0.1:8000](http://127.0.0.1:8000)

## Project Structure

```text
californiatalks/
├── app.py              # Dependency-free local/Render fallback static server
├── public/             # Static website published by Render
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── assets/
├── render.yaml         # Render static-site Blueprint
└── README.md
```

## Contact

California Talks  
ali@californiatalks.org
[californiatalks.org](https://www.californiatalks.org)
