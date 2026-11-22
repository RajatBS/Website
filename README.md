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




