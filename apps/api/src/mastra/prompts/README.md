# Prompt Management

## Architecture Overview

**Langfuse is the single source of truth for all prompts.**

```
┌─────────────────────────────────────────┐
│         Langfuse Server                 │
│    (Single Source of Truth)             │
│                                         │
│  - Orchestrator                         │
│  - Intent Classifier                    │
│  - Data Extractor                       │
│  - Data Validator                       │
│  - FNOL Agent                           │
└─────────────────────────────────────────┘
          ↓
    [Runtime]
    (Always fetches from Langfuse)
```

## Key Principles

### 🎯 Runtime Behavior
- **ALWAYS** fetches prompts from Langfuse server at runtime
- **NO** local caching or syncing
- Fallback mechanism: If a prompt with a specific label (e.g., "staging") isn't found, it automatically falls back to the latest version

### 📝 Editing Prompts
- **ONLY** edit prompts in Langfuse web UI
- Changes take effect immediately in the application
- No code deployment needed for prompt updates

## Usage

### Using Prompts in Code

All agents use the `fetchPrompt()` utility function:

```typescript
import { fetchPrompt } from "../../utils";

export const myAgent = new Agent({
  name: "my-agent",
  async instructions({ runtimeContext, mastra }) {
    return await fetchPrompt({
      promptName: "My Agent",
      runtimeContext,
      logger: mastra?.getLogger(),
    });
  },
  // ... rest of agent config
});
```

The `fetchPrompt()` function:
1. Tries to fetch the prompt with the configured label (e.g., "latest", "staging", "production")
2. If not found, falls back to the latest version
3. Compiles the prompt with runtime variables (brand name, country, etc.)
4. Returns the compiled prompt string

## Adding New Prompts

1. **Create in Langfuse**
   - Go to your Langfuse web UI
   - Create a new prompt with appropriate content
   - Optionally tag it with labels (staging, production)

2. **Use in Agent**
   - Call `fetchPrompt()` in your agent's `instructions()` function
   - Pass the exact prompt name as it appears in Langfuse

## Environment Labels

The application automatically uses labels based on `NODE_ENV`:

- **Development** (`NODE_ENV=development`): Always uses **"latest"**
- **Local** (`NODE_ENV=local`): Always uses **"latest"**
- **Test** (`NODE_ENV=test`): Always uses **"latest"**
- **Staging** (`NODE_ENV=staging`): Uses **"staging"** label (falls back to latest if not found)
- **Production** (`NODE_ENV=production`): Uses **"production"** label (falls back to latest if not found)

**No additional configuration needed** - the label is automatically selected based on your `NODE_ENV` setting.

## Troubleshooting

### "Prompt not found" errors

If you see errors like:
```
Error fetching prompt 'My Prompt-label:staging': NotFoundError
```

**Solution**: The prompt either doesn't exist or doesn't have the specified label. The application will automatically fall back to the latest version. To fix:
1. Create the prompt in Langfuse web UI
2. Or add the appropriate label to the existing prompt

### Want to test a prompt change

1. Edit the prompt in Langfuse web UI
2. Changes are immediate - fetched on each request
3. No code deployment or server restart needed
