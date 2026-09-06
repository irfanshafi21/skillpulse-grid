# SkillPulse Grid

A labour-market and curriculum intelligence prototype for Maharashtra's IT-ITeS sector. Includes a demand observatory, skill graph, curriculum comparison, district insights, employer validation, action plans, candidate readiness, and evidence/audit views.

## Run locally

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

The app reads the included `data/demo.db` automatically. It contains generated sample data, not live labour-market information. No environment variables are required for the demo.

```sh
npm run typecheck
npm run build
npm start
```

## Vercel

Import this repository, choose the Next.js framework preset, and deploy using the root directory and default npm settings. The build generates Prisma Client before compiling Next.js. File tracing includes the sample SQLite database in API functions.

The public deployment is read-only: voting and recommendation writes return HTTP 403 with a demo explanation. The role selector previews personas; it is not authentication. The ticker is a simulated demo feed.

Permanent writes require a hosted database, server-side authentication/authorization, and validation workflow hardening. Do not disable demo mode on a public deployment until those are implemented. Bundled SQLite is not persistent storage on Vercel.

## Sample dataset

The database is generated from `prisma/seed/index.ts`: 12 districts, 25 skills, 5 occupations, 90 postings, 74 demand signals, 6 courses, and 10 recommendations. The seed script replaces data and should only be used with a disposable local database.

## Deployment preparation

- Corrected demand-detail validation ordering to use `createdAt`.
- Handled optional skill and occupation relations.
- Corrected animation variant typing and enabled build type checks.
- Made the header wrap on small screens.
- Replaced environment-specific startup scripts with standard Next.js scripts.
- Excluded credentials, old Git history, archive logs, and uploaded reference documents.
