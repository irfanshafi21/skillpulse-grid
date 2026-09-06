# SkillPulse Grid

A labour-market and curriculum intelligence prototype for Maharashtra's IT-ITeS sector. Includes a demand observatory, skill graph, curriculum comparison, district insights, employer validation, action plans, candidate readiness, and evidence/audit views.

## Run locally

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Without database credentials, the app reads the included `data/demo.db`. It contains generated sample data, not live labour-market information. No environment variables are required for the local demo.

```sh
npm run typecheck
npm run build
npm start
```

## Vercel

Import this repository, choose the Next.js framework preset, and deploy using the root directory and default npm settings. The build generates Prisma Client before compiling Next.js. File tracing includes the sample SQLite database for local demo mode.

### Persistent database

Connect a dedicated **Turso libSQL** database to the `skillpulse-grid` Vercel project. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` as server-only environment variables, then redeploy. Credentials must never use a `NEXT_PUBLIC_` prefix or be committed to Git.

When credentials are present, all Prisma queries use the hosted database over HTTP. Configuration errors fail explicitly instead of silently reading the local snapshot. Millisecond timestamps are retained for compatibility with the original SQLite data.

The build runs `scripts/import-database.mjs` before compiling the site. On a new empty database, this imports all schema objects and 832 sample rows in a transaction, checks foreign keys, and writes a completion marker. Later builds detect that marker and leave stored records unchanged. Import into an unrelated nonempty database is refused. It does not wipe, reset, or re-seed an existing database. Future schema changes need explicit migrations.

You can also run the initial import with `npm run db:import` after setting the same two environment variables. Use a separate database for preview deployments if testing changes to stored data.

The public deployment is read-only: voting and recommendation writes return HTTP 403 with a demo explanation. The role selector previews personas; it is not authentication. The ticker is a simulated demo feed.

Connecting the hosted database provides permanent storage. Public write actions remain disabled until server-side authentication/authorization and validation workflow hardening are implemented. Do not disable demo mode on a public deployment until those are implemented. Bundled SQLite is not persistent storage on Vercel.

## Sample dataset

The database is generated from `prisma/seed/index.ts`: 12 districts, 25 skills, 5 occupations, 90 postings, 74 demand signals, 6 courses, and 10 recommendations. The seed script replaces data and should only be used with a disposable local database.

## Deployment preparation

- Corrected demand-detail validation ordering to use `createdAt`.
- Handled optional skill and occupation relations.
- Corrected animation variant typing and enabled build type checks.
- Made the header wrap on small screens.
- Replaced environment-specific startup scripts with standard Next.js scripts.
- Excluded credentials, old Git history, archive logs, and uploaded reference documents.
