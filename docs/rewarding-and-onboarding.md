# Healthy reward and onboarding blueprint

Design goals: keep progression generous, predictable, and readable while avoiding predatory loops. Rewards should celebrate skillful play, effort, and learning new mechanics rather than grinding or spending money.

## Reward pillars
- **Frequent wins (micro):** every run/drill pays out coins and XP, with tiny cosmetic or training tokens sprinkled in so sessions always feel productive.
- **Meaningful wins (macro):** clear milestone payouts for leveling up, division promotion, completing a big achievement, or finishing a training plan.
- **Understandable:** every reward callout states the trigger (e.g., "Post-match: clean sheet"), the currency granted, and any caps. No hidden multipliers.

## Post-match / post-drill rewards
- **Coins:** baseline coins for distance/time survived, with bonuses for goals scored, clean tackles, and completed drills. Target range: 40–120 per short session.
- **XP:** scale with performance: distance, goals, and objective completion. First three runs of the day grant +20% XP to encourage short daily visits.
- **Cosmetic loot:** small chance (5–10%) per match to drop a cosmetic token (kit pattern, boot colorway) when the player hits a personal best or finishes without collisions. No duplicates in a session; tokens unlock cosmetic catalog entries directly (no loot boxes).
- **Training points:** guaranteed 1–3 training points from drills/tutorials; in matches, award 1 point for every two goals or perfect tackle streaks.
- **Visibility:** the post-run panel itemizes each reward line with the source tag: `Distance`, `Goals`, `No collisions`, `Daily bonus`, `PB cosmetic token`.

## Milestone rewards
- **Level milestones:** every level grants coins + XP refund + training point; every 5 levels add a cosmetic token. Callout: "Level 10 reached → 350 coins + 1 training point + Neon kit trim".
- **Promotion milestones:** moving up a division grants a unique cosmetic (banner/emote) and a time-limited coin/xp boost (e.g., +10% for the next 3 runs). Never bundle power.
- **Achievement completions:** big feats (first perfect hat trick, 1,000m run, 50 career goals) drop bundled rewards: coins, XP, and 1 cosmetic token. Show progress bars in the profile so players see the next big unlock.

## Surprise rewards (healthy)
- **Micro-random bonuses:** 2–4% chance per run to roll a "Coach bonus" worth +20 coins or +50 XP; bias toward players on a loss streak to keep them engaged without spiking power.
- **Skill highlights:** event-triggered packs like "Perfect hat trick! Bonus pack unlocked." Pack contains 1 cosmetic token + small XP. No purchasable keys or rerolls.
- **Session pacing:** only one surprise reward per session; clearly label it as a bonus to avoid casino-like loops.

## Guardrails to avoid predatory patterns
- No loot boxes or real-money reroll keys. All cosmetic drops are direct unlocks or tokens with fixed costs.
- Real-money spends are optional and cosmetic/time-saving only (skins, stadium music, instant cosmetic unlocks). Never sell stat boosts, skill points, or power bundles.
- Publish odds for any randomized cosmetic token and enforce pity timers (e.g., guaranteed cosmetic every 5 sessions without one).
- Hard caps on daily XP/coin boosters and no streak-loss penalties beyond soft difficulty tuning.
- Clear earning timelines: show "~3 runs to afford next upgrade" estimates near upgrade buttons.

## Onboarding & early difficulty curve
- **Guided onboarding:** 3–4 interactive steps: move between lanes, jump/slide, shoot, and perform a tackle/drill. Each step ends with a short toast: "Next: Play your first match.".
- **Early win moments:** seed the first match with gentler obstacle spacing and a slowed keeper so new players score at least once and finish a run without being overwhelmed.
- **Adaptive difficulty:** track a short loss streak; after 2–3 failed runs, widen lanes, reduce obstacle density by ~10%, and increase coin spawns until the player wins again. Restore standard difficulty gradually after a clean run.
- **Tutorial rewards:** every tutorial step grants 20–40 coins + 25 XP + 1 training point. The first completed match guarantees a cosmetic token to showcase non-monetized rewards.
- **Clarity:** keep the HUD light during onboarding: highlight the control being taught, gray out others, and pin a "Next action" chip near the player character.

## Implementation notes
- Wire the reward panel to emit individual line items (label, amount, icon), grouped by source. Include a final summary row to show the total coins, XP, cosmetics, and training points earned.
- Add a daily bonus flag to the player profile to apply the +20% XP on the first three runs, resetting via the daily key already used for missions.
- Store loss streak and adaptive difficulty state in the run/session metadata; reset after a win or when the player hits a progress threshold (e.g., 800m run).
- Keep cosmetic catalogs client-side and deterministic. Tokens map to specific items to avoid RNG confusion.
- Surface the pity timer in the cosmetic tooltip: "Guaranteed cosmetic in ≤2 more sessions".
