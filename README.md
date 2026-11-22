# Rajat Shetty: portfolio site (Django, ready for Vercel)

A single landing page with the three-body spacetime scene, CV, a projects button that opens GitHub, and a contact form that opens the visitor's mail app.
There's no database and no admin, so it runs on Vercel's free plan with nothing to set up.

## What's where

| Path | What it is |
| --- | --- |
| `core/templates/core/_body.html` | All page content (edit text here) |
| `core/templates/core/index.html` | `<head>`: title, meta tags, font preloads, scripts |
| `core/static/core/css/site.css` | Styles, including self-hosted fonts and the GitHub button |
| `core/static/core/js/site.js` | Three-body scene, loader, animations, contact form |
| `core/static/core/js/vendor.js` | three.js r128 + GSAP 3.12 + ScrollTrigger in one file |
| `core/views.py` | The page, robots.txt, favicon |
| `portfolio/settings.py` | Settings |
| `vercel.json` | Long cache headers for static files |

## Run it locally

```bash
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

Open http://127.0.0.1:8000/

## Deploy to Vercel (free plan)

1. Push this folder to a GitHub repository. `.env` is git-ignored.
2. On vercel.com, go to Add New, then Project, and import the repository. Vercel detects Django on its own.
3. Click Deploy. That's it: Vercel collects the static files and serves them from its CDN.

Optional:
- Under Settings, Environment Variables, set `DJANGO_SECRET_KEY` to any long random string. The site works without it, because nothing is signed or stored.
- To use `rajatshetty.com`, add it under Settings, Domains. Then set `DJANGO_ALLOWED_HOSTS=rajatshetty.com,www.rajatshetty.com` and redeploy. `*.vercel.app` is always allowed.

From the CLI instead: `npm i -g vercel`, then `vercel` and `vercel --prod`.

## Why it loads fast

- Vercel's CDN caches the page (`s-maxage=86400`), so most visits never start Python. Each deploy clears the cache.
- No third-party requests: fonts, three.js and GSAP are self-hosted.
- Static files have hashed names, a one-year immutable cache and brotli compression (JS about 170 KB, CSS about 4 KB over the wire).
- Fonts are latin subsets, with the two fonts visible first preloaded. Scripts are deferred.
