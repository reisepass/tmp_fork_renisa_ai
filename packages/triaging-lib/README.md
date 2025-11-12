# @renisa/triaging-lib

Insurance conversation triage and classification library with language detection support.

## Features

- **Language Detection**: Automatically detects German or English text using:
  - Umlaut detection (ü, ö, ä, ß)
  - Mid-sentence capitalization (German noun capitalization)
  - Common word matching against 1k and 10k word lists

- **LLM Classification**: Uses AI to classify conversations with probability scores and confidence levels

- **Keyword Fallback**: Heuristic-based classification when LLM is unavailable

- **Categories**:
  - `New-Policy`: Purchasing or starting a new insurance policy
  - `Manage-Policy`: Modifying, updating, or managing existing policies
  - `General-Policy-Questions`: Questions about coverage, terms, premiums
  - `First-Notice-Of-Loss`: Reporting accidents, claims, damage, theft
  - `Other`: Everything else

## Installation

In a monorepo workspace:

```json
{
  "dependencies": {
    "@renisa/triaging-lib": "workspace:*"
  }
}
```

## Usage

```typescript
import { triageConversation, detectLanguage, type Category } from '@renisa/triaging-lib';

// Classify a conversation (with LLM)
const category = await triageConversation("I want to report a car accident");
// Returns: "First-Notice-Of-Loss"

// Classify with heuristic-only mode (no LLM)
const category = await triageConversation("Ich möchte eine neue Versicherung", true);
// Returns: "New-Policy"

// Detect language
const language = detectLanguage("Hello, I have a question");
// Returns: "english"

const language = detectLanguage("Guten Tag, ich habe eine Frage");
// Returns: "german"
```

## API

### `triageConversation(text: string, heuristicOnly?: boolean): Promise<Category>`

Classifies a conversation into one of the predefined categories.

**Parameters:**
- `text` - The conversation text to classify
- `heuristicOnly` - If `true`, skips LLM and uses only keyword-based classification (default: `false`)

**Returns:** A Promise resolving to the category string

**Environment Variables:**
- `OPENROUTER_KEY` - Required for LLM classification (if heuristicOnly is false)

### `detectLanguage(text: string): 'german' | 'english'`

Detects whether text is in German or English.

**Parameters:**
- `text` - The text to analyze

**Returns:** Either `'german'` or `'english'`. Defaults to `'german'` if unclear.

### Types

```typescript
export type Category =
  | "New-Policy"
  | "Manage-Policy"
  | "General-Policy-Questions"
  | "First-Notice-Of-Loss"
  | "Other";

export interface LLMResponse {
  "New-Policy-Probability": number;
  "New-Policy-Confidence": number;
  "Manage-Policy-Probability": number;
  "Manage-Policy-Confidence": number;
  "General-Policy-Questions-Probability": number;
  "General-Policy-Questions-Confidence": number;
  "First-Notice-Of-Loss-Probability": number;
  "First-Notice-Of-Loss-Confidence": number;
  "Other-Probability": number;
  "Other-Confidence": number;
  category: Category;
}
```

## Examples

### With LLM (requires OPENROUTER_KEY)

```typescript
process.env.OPENROUTER_KEY = 'your-api-key';

const result = await triageConversation(
  "My car was damaged in an accident yesterday"
);
// Result: "First-Notice-Of-Loss"
```

### Heuristic-Only Mode

```typescript
const result = await triageConversation(
  "I want to change my IBAN for premium payments",
  true  // heuristic-only mode
);
// Result: "Manage-Policy"
```

### Language Detection

```typescript
// German text with umlauts
const lang1 = detectLanguage("Ich möchte meine Adresse ändern");
// Returns: "german"

// English text
const lang2 = detectLanguage("I want to update my address");
// Returns: "english"

// German text with noun capitalization
const lang3 = detectLanguage("Die Versicherung deckt den Schaden");
// Returns: "german"
```

## Building

```bash
pnpm run build
```

## Development

```bash
pnpm run dev  # Watch mode
```

## License

ISC
