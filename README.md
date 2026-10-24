
# Matchwork

**The game, understood.**

Matchwork is a synthetic football intelligence platform developed for the Microsoft Premier League Inside the Game Developer Hackathon 2026.

The project is designed to transform football event data into statistics, evidence-based match insights, and personalized viewing experiences.

## Current Project Status

**Phase 3: Synthetic Match Intelligence — Feature Development**

The application currently supports:

- Reproducible synthetic football match generation
- Two fictional teams with 11 starting players each
- A 90-minute simulated match
- Configurable event generation from 900 to 1,400 events
- Passes, shots, tackles, defensive pressure, and possession changes
- Event-derived team statistics
- Time-based possession estimates
- Interactive match replay
- Play, pause, restart, and timeline seeking
- Playback speeds of 1x, 4x, and 16x
- Synchronized scoreboard, statistics, and event feed
- Automated generator, statistics, replay, and integration verification
- Rolling three-minute feature windows, based only on visible replay events
- Compact synthetic-trained ONNX classification of control, pressure and transitions
- Microsoft ONNX Runtime Web WASM inference when browser runtime is available
- Explicit failure state when ONNX inference is unavailable
- Event-grounded explanations, evidence IDs and generated match recaps
- Separate Fan and Analyst presentations and team-focused narratives

The implementation uses synthetic data only.

## Planned Features

The following features are not yet implemented:

- Expanded AI inference and model validation with realistic synthetic match labels
- Player-focused intelligence
- Automated match narratives and recaps
- Broadcast-style insight overlays
- Public deployment

These capabilities will be developed in subsequent authorized phases.

## Technology Stack

### Currently Implemented

- React
- TypeScript
- Vite
- CSS
- Node.js 24
- Git and GitHub

### Planned

- Python for offline machine learning
- Microsoft ONNX Runtime Web for browser inference
- GitHub Pages for static application hosting

GitHub Actions runs automated build and regression verification. Browser ONNX Runtime Web uses version-pinned CDN imports and WASM assets. A network connection is currently required for Microsoft AI inference.

## Project Structure

```text
matchwork/
├── .github/
│   └── workflows/
│       └── quality.yml
├── public/
├── scripts/
│   ├── verifyGenerator.mjs
│   ├── verifyStats.mjs
│   ├── verifyReplay.mjs
│   └── verifyIntegration.mjs
├── src/
│   ├── data/
│   │   └── demoMatch.ts
│   ├── engine/
│   │   ├── generateEvents.ts
│   │   ├── calculateStats.ts
│   │   └── replay.ts
│   ├── types/
│   │   └── match.ts
│   ├── App.tsx
│   └── App.css
├── package.json
└── package-lock.json
```

Additional configuration and assets are retained from the Vite foundation.

## Local Development

### Requirements

- Node.js 24
- npm

### Install Dependencies

```bash
npm ci
```

### Start the Development Server

```bash
npm run dev
```

Open the local URL displayed by Vite.

### Production Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Verification

Run the four verification scripts:

```bash
node scripts/verifyGenerator.mjs
node scripts/verifyStats.mjs
node scripts/verifyReplay.mjs
node scripts/verifyIntegration.mjs
```

The integration suite verifies 12 combinations of seeds and event counts, covering 14,000 generated events in total.

The verification scripts use Node.js built-in functionality and require no additional testing packages.

## Explainable AI and Model Provenance

The match-state model is a small ONNX logistic classifier (7 input features, 3 labels, 340-byte graph). It runs using Microsoft's ONNX Runtime Web WASM backend when the pinned public runtime resources load in the browser.

The synthetic labels and training exemplars are deliberately generated from handcrafted state prototypes. Reproduce them without any Python dependencies:

```bash
python scripts/train_match_state.py
```

The model is an illustrative proof of ONNX inference and **has not been validated on real football data**. Synthetic-prototype validation accuracy does not measure performance on authentic matches.

Prediction scores are **not** calibrated real-world probabilities. Explanations and recaps use deterministic templates grounded in observed synthetic event counts and IDs, not a generative language model. If the runtime fails to load, the dashboard transparently reports AI unavailable rather than fabricating inference.

The classifier input contains passing continuity, pressure, turnover and shot rates, event tempo, final-third action share, and score tension. Only events up to the replay timestamp are used.

### Phase 3 smoke test

```bash
node scripts/verifyIntelligence.mjs
```

## Data Integrity and Limitations

All teams, players, and events are fictional.

The system does not depend on live Premier League feeds, actual player tracking, or unlicensed broadcast footage.

The match generator is a simplified simulation rather than a complete implementation of football rules.

Possession is estimated from synthetic possession transitions. It is not measured from physical ball-tracking data.

TypeScript contracts and current verification scripts do not establish comprehensive runtime validation for arbitrary external match files.

Current match statistics are calculated from generated events rather than hardcoded dashboard values.

## CI and Deployment

A GitHub Actions workflow checks:

1. Locked dependency installation
2. Production compilation
3. Lint
4. Synthetic event generation
5. Statistics calculation
6. Replay consistency
7. Multi-seed integration
8. Phase 3 intelligence feature extraction

These are automated verification checks, not a deployment workflow.

GitHub Pages is the planned public hosting platform but is not yet configured.

## License

MIT licensing is the preferred option pending final contributor agreement.

No explicit open-source license has been issued yet.

## Development and Contributions

Development is currently proceeding in solo mode.

Future contributors should use feature branches and pull requests rather than modifying the stable main branch directly.
