
# Matchwork

**The game, understood.**

Matchwork is a synthetic football intelligence platform developed for the Microsoft Premier League Inside the Game Developer Hackathon 2026.

The project is designed to transform football event data into statistics, evidence-based match insights, and personalized viewing experiences.

## Current Project Status

**Phase 2: Synthetic Match Data and Replay — Implemented**

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

The implementation uses synthetic data only.

## Planned Features

The following features are not yet implemented:

- Microsoft ONNX Runtime Web inference
- AI-assisted match-state classification
- Evidence-based explanations of match developments
- Personalized Fan and Analyst viewing modes
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

GitHub Actions is being introduced for automated build and regression verification.

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

These are automated verification checks, not a deployment workflow.

GitHub Pages is the planned public hosting platform but is not yet configured.

## License

MIT licensing is the preferred option pending final contributor agreement.

No explicit open-source license has been issued yet.

## Development and Contributions

Development is currently proceeding in solo mode.

Future contributors should use feature branches and pull requests rather than modifying the stable main branch directly.
