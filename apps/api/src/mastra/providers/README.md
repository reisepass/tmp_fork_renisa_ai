# OpenRouter Provider Configuration

This directory contains OpenRouter provider configuration for controlling which infrastructure providers serve your models.

## Overview

OpenRouter routes requests to multiple infrastructure providers (DeepInfra, Together AI, Fireworks, etc.). By default, it uses load balancing to distribute requests. However, different providers may have different:

- Quantization levels (fp4, fp8, bf16)
- Performance characteristics
- Cost structures
- Reliability

This configuration allows you to control provider routing.

## Usage

### Basic Usage (Default Provider)

Most agents use the default provider without specific routing:

```typescript
import { Agent } from "@mastra/core/agent";

const agent = new Agent({
  model: "openrouter/google/gemini-2.5-flash",
  // ... other config
});
```

### OSS Models with Provider Preferences

For OSS models like `openai/gpt-oss-120b`, use the pre-configured provider preferences:

```typescript
import { Agent } from "@mastra/core/agent";
import { openrouterWithOSSPreferences } from "../providers/openrouter";

const agent = new Agent({
  model: openrouterWithOSSPreferences("openai/gpt-oss-120b"),
  // ... other config
});
```

This configuration:
- **Excludes**: `chutes/bf16` (always ignored for poor performance)
- **Prefers**: `deepinfra/fp4` (first choice)
- **Fallback**: `siliconflow/fp8`, then `novita/bf16`
- **Quantizations**: Only allows fp4, fp8, bf16
- **Sort**: By throughput for better performance

### Custom Provider Preferences

For custom routing needs:

```typescript
import { openrouterWithProviderPreferences } from "../providers/openrouter";

const model = openrouterWithProviderPreferences("openai/gpt-oss-120b", {
  ignore: ["chutes"], // Exclude specific providers
  order: ["deepinfra", "together"], // Preference order
  quantizations: ["fp8"], // Only fp8 quantization
  allow_fallbacks: false, // Strict routing (fail if unavailable)
  sort: "price", // Sort by price instead of throughput
});
```

## Provider Routing Options

### `ignore` (string[])
Provider slugs to exclude from routing. Always excludes the provider regardless of other settings.

Example:
```typescript
ignore: ["chutes/bf16", "provider-name"]
```

### `order` (string[])
Ordered list of providers to try. The router attempts the first provider, falling back to subsequent ones if unavailable.

Example:
```typescript
order: ["deepinfra/fp4", "siliconflow/fp8", "novita/bf16"]
```

**Note**: Provider slugs can include quantization suffix (e.g., `deepinfra/fp4`) to target specific deployments.

### `quantizations` (string[])
Filter providers by quantization levels. Supported values:
- `int4`, `int8` (integer quantization)
- `fp4`, `fp6`, `fp8`, `fp16` (floating point)
- `bf16` (brain float 16)
- `fp32` (full precision)
- `unknown`

Example:
```typescript
quantizations: ["fp4", "fp8", "bf16"]
```

### `allow_fallbacks` (boolean)
Whether to allow fallback to other providers if preferred ones are unavailable.

- `true` (default): Fallback to other providers if needed
- `false`: Fail request if preferred providers unavailable

### `sort` (string)
How to sort providers when selecting:

- `"throughput"`: Prioritize faster providers
- `"price"`: Prioritize cheaper providers

### `only` (string[])
Restrict routing to ONLY these specific providers. More restrictive than `order`.

Example:
```typescript
only: ["deepinfra", "together"]
```

### `data_collection` (string)
Control data collection preferences:

- `"allow"`: Allow data collection
- `"deny"`: Opt out of data collection

## Comparing Providers for OSS Models

To compare different providers for the same model:

### DeepInfra FP4
```typescript
const model = openrouterWithProviderPreferences("openai/gpt-oss-120b", {
  only: ["deepinfra/fp4"],
  allow_fallbacks: false,
});
```

### SiliconFlow FP8
```typescript
const model = openrouterWithProviderPreferences("openai/gpt-oss-120b", {
  only: ["siliconflow/fp8"],
  allow_fallbacks: false,
});
```

### Novita BF16
```typescript
const model = openrouterWithProviderPreferences("openai/gpt-oss-120b", {
  only: ["novita/bf16"],
  allow_fallbacks: false,
});
```

## Provider Slugs

Common provider slugs:
- `deepinfra` - DeepInfra
- `together` - Together AI
- `fireworks` - Fireworks AI
- `siliconflow` - Silicon Flow
- `novita` - Novita
- `chutes` - Chutes (excluded by default)

**Quantization suffixes**: Add `/fp4`, `/fp8`, `/bf16` etc. to target specific quantization levels.

## References

- [OpenRouter Provider Routing Docs](https://openrouter.ai/docs/features/provider-routing)
- [OpenRouter API Reference](https://openrouter.ai/docs/api-reference/overview)
- [@openrouter/ai-sdk-provider](https://www.npmjs.com/package/@openrouter/ai-sdk-provider)
