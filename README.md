# Reputation Lens

A static MVP prototype for an X API safety layer that reviews public account signals before a user follows, replies, DMs, or trusts an account.

## MVP Scope

- Account lookup by X handle
- Bot/spam risk score with careful, non-accusatory language
- Separate risk signals, trust signals, recent evidence, confidence, and recommended action
- Demo watchlist with low, elevated, and high-risk examples

## X API Fit

The production version would connect these surfaces:

- User lookup for profile metadata, verification state, public metrics, and account age
- User timelines and search for recent posting patterns
- Post metrics for engagement consistency
- Follows/lists for network overlap and trusted-list context
- DMs only for user-authorized inbox triage, if granted

## Run With Demo Data

Open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Run With X API

Create `.env` from `.env.example`, add your X bearer token, then run:

```sh
node server.js
```

Then visit `http://localhost:4173` and scan a real handle.
