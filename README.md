# Ultimate Striker Run

A lightweight HTML5 Temple Run–style soccer runner with mobile-friendly swipe controls, keyboard support, and simple “Ultimate Team” style striker cards.

## Features
- Three-lane endless runner with jump/slide mechanics and soccer-themed obstacles.
- Coin and ball pickups that build a shot meter and trigger goals.
- Unlockable striker cards that modify speed, coin gain, and shot meter fill.
- In-game HUD, pause, settings, squad selection, and game-over summary screens.
- Local persistence for coins, best distance, goals, and unlocked cards.
- V3 street-court visual that swaps stadium grass for an urban asphalt cage inspired by street football.

## Project structure
```
index.html
styles.css
js/
  game.js
  input.js
  main.js
  playerData.js
assets/
  (drop any images or audio here)
```

## Run locally
Open `index.html` in a browser or serve the folder with a static server (example shown below):

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Styling with Tailwind CSS
- Tailwind CSS is loaded from the CDN in `index.html`, with theme colors and fonts configured to match the game's palette.
- You can immediately use Tailwind utility classes in your markup without a build step.
- Update the inline `tailwind.config` object in `index.html` if you want to extend the design tokens.

## 3D live preview
- The production 3D build is served from `https://richducat.github.io/footy-run-3d/?embed=1`.
- The landing page loads that URL inside an iframe and falls back to the local build after 3.5 seconds or on error/offline.
- When the build runs inside the iframe (signaled by `?embed=1`), the nested preview is skipped and the game boots immediately, preventing infinite iframe recursion.

## Healthy rewards & onboarding
- A concise blueprint for generous, non-predatory rewards (coins, XP, cosmetics, training points) plus adaptive onboarding is documented in `docs/rewarding-and-onboarding.md`.
- Key ideas: frequent micro wins, clear milestone payouts, gentle surprise rewards, transparent odds, and an onboarding flow with early wins and adaptive difficulty.

## Deploy to GitHub Pages
1. Push the repo to GitHub.
2. In **Settings → Pages**, choose **Deploy from a branch** and select the `main` branch with the root directory.
3. After the build finishes, access the site at `https://<username>.github.io/<repo-name>/`.

This build uses only original branding and assets—no licensed clubs, logos, or likenesses.
