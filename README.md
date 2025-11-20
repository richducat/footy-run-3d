# Footy Run 3D

A small WebGL endless runner demo using [Three.js](https://threejs.org/).

## Run locally

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Deploy to your own URL

### One-click GitHub Pages

The repository includes a GitHub Actions workflow (`.github/workflows/pages.yml`) that publishes the contents of the `main` branch to GitHub Pages automatically. After pushing to your own GitHub repository:

1. Open **Settings → Pages** and select **GitHub Actions** as the source.
2. Push to `main` and confirm the `Deploy to GitHub Pages` workflow succeeds in the **Actions** tab (if it fails, re-run after enabling Pages).
3. The live site will be available at `https://<username>.github.io/<repo-name>/` once the deployment job completes.
4. (Optional) Add a `CNAME` file at the repo root that contains only your custom domain name, e.g. `play.myfootydemo.com`.

### Other static hosts

Because the project is a single static page you can push it to any static host (Netlify, Vercel, Cloudflare Pages, S3+CloudFront, etc.). Upload `index.html` (and any future assets) and point your domain's DNS records at the host's endpoint.
