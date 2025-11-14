# Footy Run 3D

A small WebGL endless runner demo using [Three.js](https://threejs.org/).

## Run locally

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Deploy to your own URL

Because the project is a single static page you can push it to any static host. Here is an example workflow using GitHub Pages with a custom domain:

1. Create a GitHub repository and push this project.
2. In the repository settings, enable **Pages** and set the source to the `main` branch.
3. (Optional) Add a `CNAME` file at the repo root that contains only your custom domain name, e.g. `play.myfootydemo.com`.
4. In your domain registrar's DNS, create a CNAME record pointing your domain (or subdomain) to `username.github.io`.
5. Once DNS propagates, visiting your domain will load the latest commit from this repository.

Any other static host (Netlify, Vercel, Cloudflare Pages, S3+CloudFront, etc.) works the same—upload `index.html` (and any future assets) and point your domain's DNS records at the host's endpoint.
