# Ultimate Striker Run

A lightweight HTML5 Temple Run–style soccer runner with mobile-friendly swipe controls, keyboard support, and simple “Ultimate Team” style striker cards.

## Features
- Three-lane endless runner with jump/slide mechanics and soccer-themed obstacles.
- Coin and ball pickups that build a shot meter and trigger goals.
- Unlockable striker cards that modify speed, coin gain, and shot meter fill.
- In-game HUD, pause, settings, squad selection, and game-over summary screens.
- Local persistence for coins, best distance, goals, and unlocked cards.

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

## Deploy to GitHub Pages
1. Push the repo to GitHub.
2. In **Settings → Pages**, choose **Deploy from a branch** and select the `main` branch with the root directory.
3. After the build finishes, access the site at `https://<username>.github.io/<repo-name>/`.

This build uses only original branding and assets—no licensed clubs, logos, or likenesses.
