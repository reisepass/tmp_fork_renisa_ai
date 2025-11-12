# AGENTS.md - Development Guide for AI Coding Agents

## Commands

- `pnpm dev` - Start all services via Turborepo (requires Supabase: `pnpm --filter supabase start`)
- `pnpm build` - Build all apps/packages
- `pnpm lint` - Lint all workspaces | `pnpm --filter {api|web} lint:fix` - Fix linting issues
- `pnpm type-check` - TypeScript type checking across all workspaces
- `pnpm test` - Run all tests (no test suites currently configured)
- `pnpm --filter api dev` - Start API only | `pnpm --filter web dev` - Start web only

## Code Style

- **Formatting**: Prettier enforced - 2 spaces, 80 char width, double quotes, semicolons, LF line endings
- **Imports**: Ordered alphabetically with newlines between groups (builtin → external → internal → parent → sibling → index)
- **Types**: Explicit module boundary types required (`@typescript-eslint/explicit-module-boundary-types`)
- **Naming**: `camelCase` for functions/variables/constants, `PascalCase` for React components/types/interfaces
- **Unused vars**: Prefix with underscore `_` to ignore eslint errors
- **No explicit any**: Avoid `any`, use specific types or `unknown` (warning level)

## Commit Messages (from .cursor/commit-messages.mdc)

Format: `<type>: <description>` (lowercase after colon, no period, present tense)
Types: `feat` (new features), `fix` (bug fixes), `refactor` (restructuring), `chore` (maintenance), `docs` (documentation)
