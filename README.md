# Renisa.ai

AI-powered insurance consultation platform, built as a monorepo with a Next.js web app and a Mastra-based AI API.

## Monorepo Structure

- `apps/web`: Next.js 15 web application (React 19, Tailwind CSS 4)
- `apps/api`: Mastra AI service (agents, tools, workflows; Hono server)
- `packages/config`: Shared env validation and config (Zod)
- `packages/utils`: Shared utilities

## Tech Stack

- Web: Next.js 15, React 19, Tailwind CSS 4
- API: Mastra, AI SDK, Hono
- Langfuse tracing, OpenAI provider
- TypeScript throughout, Turborepo for orchestration, pnpm workspaces

## Requirements

- Node.js >= 22.18.0
- pnpm (see `packageManager` in root `package.json`)
- Supabase CLI and Docker (for local database)

## Environment Variables

Environment files are organized by workspace and support both local development and cloud environments. Use the provided script to manage environment configurations:

```bash
# Environment management script
./bin/handle-env.sh
```

### Environment File Structure

**API Environment** (`apps/api/`):

- `.env.example` - Template with placeholder values
- `.env` - Local development (created from template)
- `.env.staging` - Staging environment (from AWS Secrets Manager)
- `.env.production` - Production environment (from AWS Secrets Manager)

**Web Environment** (`apps/web/`):

- `.env.example` - Template with placeholder values
- `.env` - Local development (created from template)
- `.env.staging` - Auto-generated from API staging secrets
- `.env.production` - Auto-generated from API production secrets

### Local Development Setup

1. Run the environment setup script:

   ```bash
   ./bin/handle-env.sh
   ```

2. Choose option 1 to create `.env` files from templates

3. Manually add your API keys to `apps/api/.env`:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

### Staging/Production Setup

The script can pull environment variables from AWS Secrets Manager:

- **Staging**: `mastra/config/staging` (region: eu-central-1)
- **Production**: `mastra/config/production` (region: eu-central-1)

Use options 3-4 in the script to pull secrets from AWS, which will:

- Create `apps/api/.env.staging` or `apps/api/.env.production` with secrets from AWS
- Auto-generate `apps/web/.env.staging` or `apps/web/.env.production` with the correct bearer token and API URL

### Pushing Changes to AWS

Use options 5-6 in the script to push local `.env.staging` or `.env.production` changes back to AWS Secrets Manager.

**Important**: All environment files (`.env`, `.env.staging`, `.env.production`) are git-ignored and should never be committed.

## Supabase (must be running for local dev)

Start the local Supabase stack before running the apps:

```bash
pnpm --filter supabase start
```

This starts Postgres on 54322, API on 54321, and Studio on 54323. The API and web app expect the DB to be reachable via the `DB_CONNECTION_STRING` above.

## Scripts

From the repo root:

```bash
pnpm install
pnpm dev          # Runs all dev servers via Turborepo
pnpm build        # Builds all apps/packages
pnpm lint         # Lints all workspaces
pnpm type-check   # Type checks all workspaces
```

Run apps individually:

```bash
# Web (Next.js)
pnpm --filter web dev

# API (Mastra)
pnpm --filter api dev
NODE_ENV=local|staging|production pnpm --filter api ingest-kb      # optional: ingest knowledge base
```

## Features

- **AI agents**: knowledge, data-collection, and orchestrator agents with tools and workflows
- **Chat UI**: streaming responses, citations, inline reasoning view
- **Observability**: Langfuse tracing for agents and tools

## License

MIT — see `LICENSE` for details.
