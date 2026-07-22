# People's Taste

Trust-based food discovery engine. See `peoples-taste-master-build-document.md` for the full product spec — that document is the single source of truth for what gets built and in what order.

## Stack

React + Vite + TypeScript + Tailwind v4 · Firebase (Auth, Firestore, Hosting; App Check/Functions coming in later phases).

## Status

**Phase 0 — Foundation**, in progress. Exit criteria: owner can log in, seed a restaurant via Places autocomplete, and see it cached in Firestore on localhost.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Firebase web config
npm run dev
```

## Firebase

```bash
firebase deploy --only firestore   # rules + indexes
```

Project: `peoplestaste8`.
