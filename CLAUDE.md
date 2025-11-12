# CLAUDE.md - Project Configuration for Claude Code

## Project Overview

Renisa.ai is an AI-powered insurance consultation platform built as a monorepo with a Next.js web app and a Mastra-based AI API, featuring a multi-agent system for personalized insurance advice.

## Development Commands

### Start Development Server

```bash
# Start all services (recommended for development)
pnpm dev

# Or run in tmux session to keep servers running in background
tmux new-session -d -s renisa-dev 'pnpm dev'
```

This runs both the Next.js web app and Mastra API concurrently via Turborepo.

**Important**: Supabase must be running locally before starting development. Run `pnpm --filter supabase start` first.

### Individual Commands

**Root-level commands:**
- `pnpm dev` - Start all dev servers via Turborepo
- `pnpm build` - Build all apps/packages
- `pnpm lint` - Run ESLint across all workspaces
- `pnpm type-check` - Type check all workspaces
- `pnpm clean` - Clean all build artifacts and node_modules

**API-specific commands:**
- `pnpm --filter api dev` - Start Mastra API development server
- `pnpm --filter api dev:staging` - Start with staging environment
- `pnpm --filter api dev:prod` - Start with production environment
- `pnpm --filter api build` - Build Mastra API
- `pnpm --filter api ingest-kb` - Ingest knowledge base data

**Web-specific commands:**
- `pnpm --filter web dev` - Start Next.js development server
- `pnpm --filter web build` - Build Next.js app
- `pnpm --filter web start` - Start Next.js production server

**Supabase commands:**
- `pnpm --filter supabase start` - Start local Supabase (required for local dev)
- `pnpm --filter supabase stop` - Stop local Supabase

## Project Structure

This is a Turborepo monorepo with the following structure:

### Apps

**`apps/api/`** - Mastra AI service (Hono server)
- `src/mastra/agents/` - AI agents (orchestrator, intent-classifier, data-extractor, data-validator)
- `src/mastra/tools/` - Mastra tools
- `src/mastra/workflows/` - Mastra workflows
- `src/mastra/providers/` - AI model providers
- `src/mastra/scripts/` - Utility scripts (e.g., knowledge base ingestion)

**`apps/web/`** - Next.js 15 web application
- `app/` - Next.js App Router pages and layouts
- `components/` - React UI components (chat interface, UI primitives)
- `lib/` - Client-side utilities
- `public/` - Static assets

### Packages

- `packages/config/` - Shared environment validation and configuration (Zod schemas)
- `packages/utils/` - Shared utilities across apps
- `packages/typescript-config/` - Shared TypeScript configurations
- `packages/eslint-config/` - Shared ESLint configurations
- `packages/supabase/` - Supabase local development setup

## Tech Stack

### Frontend
- **Next.js 15** with App Router (React 19)
- **Tailwind CSS 4** for styling
- **AI SDK v5** (`@ai-sdk/react`) for streaming chat UI
- **Radix UI** for accessible UI components
- **Lucide React** for icons

### Backend
- **Mastra** for AI orchestration and agent management
- **Hono** web framework for the API server
- **AI SDK v5** (`ai`, `@ai-sdk/openai`) for streaming and tool execution
- **OpenAI** and **OpenRouter** AI providers
- **Langfuse** for observability and tracing
- **Supabase** (Postgres) for data persistence

### Infrastructure
- **Turborepo** for monorepo orchestration
- **pnpm** workspaces for dependency management
- **TypeScript** throughout for type safety
- **ESLint** and **Prettier** for code quality

## Key Features

- **Multi-agent AI system** with intelligent routing and specialized agents:
  - Orchestrator agent for conversation management
  - Intent classifier for determining user goals
  - Data extractor for collecting user information
  - Data validator for ensuring data quality
- **Private liability insurance focus** - specialized domain expertise
- **Real-time streaming chat** interface with AI SDK v5 integration
- **Dynamic UI actions** and quick response buttons
- **Schema-driven data collection** for personalized quotes
- **Observability** with Langfuse tracing
- **Multi-environment support** (local, staging, production)

## Testing & Quality

- Run `pnpm lint` to check code quality across all workspaces
- Run `pnpm type-check` for TypeScript compilation checks
- Manual testing recommended for agent interactions and conversation flows

## Environment Setup

Use the environment management script for easy setup:

```bash
./bin/handle-env.sh
```

This script handles:
- Creating `.env` files from templates for local development
- Pulling secrets from AWS Secrets Manager for staging/production
- Pushing local changes back to AWS
- Auto-generating web app environment files with matching suffixes

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

4. Start Supabase:
   ```bash
   pnpm --filter supabase start
   ```

5. Start development servers:
   ```bash
   pnpm dev
   ```

### Staging/Production Setup

The script can pull environment variables from AWS Secrets Manager:
- **Staging**: `mastra/config/staging` (region: eu-central-1)
- **Production**: `mastra/config/production` (region: eu-central-1)

Use options 3-4 in the script to pull secrets from AWS.

**Important**: All environment files are git-ignored and should never be committed.

## Development Notes

- **Node.js >= 22.18.0** required
- **pnpm** is the package manager (see `packageManager` in root package.json)
- **TypeScript 5.9.3** used throughout
- **Turborepo** orchestrates all builds and dev servers
- **Mastra** powers the AI agent system
- **AI SDK v5** for streaming responses and tool execution
- **Supabase** required for local development (Postgres on 54322, API on 54321, Studio on 54323)

## Multi-Agent Architecture

### Agent Structure

The system uses a multi-agent approach with specialized agents:

**Orchestrator Agent** (`agents/orchestrator/`)
- **Role**: Main conversation coordinator and agent router
- **Responsibilities**: Directs conversations to appropriate specialized agents
- **Tools**: Delegates to other agents based on conversation context

**Intent Classifier Agent** (`agents/intent-classifier/`)
- **Role**: Determines user intent from messages
- **Responsibilities**: Classifies user goals and routes accordingly

**Data Extractor Agent** (`agents/data-extractor/`)
- **Role**: Collects required information from users
- **Responsibilities**: Progressive data collection using schema-driven approach

**Data Validator Agent** (`agents/data-validator/`)
- **Role**: Validates collected user data
- **Responsibilities**: Ensures data quality and completeness

### Agent Communication

- **Orchestrator pattern**: Central orchestrator routes to specialized agents
- **Context preservation**: User data maintained across agent interactions
- **Tool-based execution**: Agents use tools for structured operations
- **Streaming responses**: Real-time streaming for better UX

## AI Agent Implementation Guidelines

### Core Principles

**1. Strict Knowledge Boundaries**
- Use verified information from knowledge sources
- Never invent or guess information
- Private liability insurance focus

**2. Tool Execution Standards**
- Tools executed via AI SDK, not displayed as text
- Structured tool calls for predictable behavior
- Error handling with graceful fallbacks

**3. Data Collection Patterns**
- Schema-driven field requirements from Zod schemas
- Progressive data collection
- Complete validation before proceeding

**4. Conversation Flow Management**
- Clear stage definitions
- Proper error handling
- User-friendly validation messages

### Technical Implementation

**File Structure:**
- `agents/{agent-name}/` - Agent-specific code and configuration
- `agents/prompts/` - Shared prompt templates
- `tools/` - Shared tools across agents
- `workflows/` - Multi-step workflows

**Best Practices:**
- Use TypeScript for type safety
- Follow Mastra conventions for agents and tools
- Implement proper error handling
- Add tracing for observability

**Testing Approach:**
- Manual testing for conversation flows
- Test agent routing and handoffs
- Validate data collection and persistence
- Check observability traces in Langfuse

## Prompt Management

### Architecture

**Single Source of Truth: Langfuse Server**

All prompts are managed exclusively in Langfuse:
- **Runtime**: Application ALWAYS fetches prompts directly from Langfuse server at runtime
- **Editing**: All prompt changes must be made in Langfuse web UI
- **No Local Cache**: No local caching or syncing is performed

### Environment-Based Prompt Labels

The application automatically selects prompt versions based on environment:

- **Development** (`NODE_ENV=development`): Always uses **"latest"** prompt version
- **Local** (`NODE_ENV=local`): Always uses **"latest"** prompt version
- **Test** (`NODE_ENV=test`): Always uses **"latest"** prompt version
- **Staging** (`NODE_ENV=staging`): Uses **"staging"** label (falls back to "latest" if not found)
- **Production** (`NODE_ENV=production`): Uses **"production"** label (falls back to "latest" if not found)

This is configured in `packages/config/src/env.ts:106`

### Current Prompts

The application uses these prompts:
- `Orchestrator` - Main conversation coordinator
- `Intent Classifier` - User intent detection
- `Data Extractor` - Information collection
- `Data Validator` - Data quality validation
- `FNOL Agent` - First Notice of Loss handling

### Adding New Prompts

1. Create the prompt in Langfuse web UI with appropriate labels (staging/production)
2. Use `fetchPrompt()` in your agent's `instructions()` function
3. The prompt will be fetched directly from Langfuse at runtime
