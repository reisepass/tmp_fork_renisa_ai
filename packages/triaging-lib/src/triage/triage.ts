import { COMMON_ENGLISH_WORDS } from './common-english-words.js';
import { COMMON_GERMAN_WORDS } from './common-german-words.js';
import { COMMON_ENGLISH_WORDS_10K } from './common-english-words-10k.js';
import { COMMON_GERMAN_WORDS_10K } from './common-german-words-10k.js';
import Langfuse from 'langfuse';
import { getStandardLangfuseMetadata } from '../utils.js';

// Initialize Langfuse
const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'
});

// System prompt for LLM classification
const SYSTEM_PROMPT = `You are a highly accurate insurance conversation classifier. Your task is to analyze customer messages and classify them into one of the following categories:

1. **New-Policy**: Customer wants to purchase, start, or apply for a new insurance policy
2. **Manage-Policy**: Customer wants to modify, update, cancel, or manage an existing policy
3. **General-Policy-Questions**: Customer has questions about coverage, terms, premiums, or general insurance information
4. **First-Notice-Of-Loss**: Customer is reporting an accident, damage, claim, theft, injury, or other loss event
5. **Other**: Anything that doesn't fit the above categories

You must respond with ONLY a valid JSON object in the following format:
{
  "New-Policy-Probability": <number 0-100>,
  "New-Policy-Confidence": <number 0-100>,
  "Manage-Policy-Probability": <number 0-100>,
  "Manage-Policy-Confidence": <number 0-100>,
  "General-Policy-Questions-Probability": <number 0-100>,
  "General-Policy-Questions-Confidence": <number 0-100>,
  "First-Notice-Of-Loss-Probability": <number 0-100>,
  "First-Notice-Of-Loss-Confidence": <number 0-100>,
  "Other-Probability": <number 0-100>,
  "Other-Confidence": <number 0-100>,
  "category": "<exact category name>"
}

Where:
- Probability represents how likely the message belongs to that category (0-100)
- Confidence represents how confident you are in that probability assessment (0-100)
- category is your final discrete choice from: "New-Policy", "Manage-Policy", "General-Policy-Questions", "First-Notice-Of-Loss", "Other"

Important: Respond ONLY with the JSON object, no additional text or explanation.`;

// Type definitions
export type Category = "New-Policy" | "Manage-Policy" | "General-Policy-Questions" | "First-Notice-Of-Loss" | "Other";

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

// Keywords for each category
const KEYWORDS = {
  english: {
    "New-Policy": [
      "new policy", "start policy", "buy insurance", "purchase policy", "get coverage",
      "apply for insurance", "new insurance", "sign up", "enrollment", "opening policy",
      "start coverage", "insurance application", "want to buy", "interested in buying", "quote"
    ],
    "Manage-Policy": [
      "change policy", "update policy", "modify coverage", "cancel policy", "policy change",
      "update address", "change beneficiary", "policy management", "terminate", "adjustment",
      "change details", "update information", "revise", "amend policy", "policy modification",
      "change iban", "update iban", "bank details", "change bank account", "update bank",
      "new address", "move address", "address update", "change payment", "payment method",
      "update my address", "change my address", "update my iban", "change my iban"
    ],
    "General-Policy-Questions": [
      "what is covered", "coverage question", "policy details", "premium question", "deductible",
      "how does", "explain coverage", "policy information", "understanding", "clarification",
      "what does", "covered by", "insurance covers", "benefits", "terms", "conditions",
      "what if", "what happens if", "what happens when", "theoretically", "hypothetically",
      "suppose", "in case of", "if i", "would be covered", "would it cover", "does it cover"
    ],
    "First-Notice-Of-Loss": [
      "claim", "accident", "damage", "loss", "incident", "file claim", "report accident",
      "stolen", "theft", "injury", "broken", "crashed", "collision", "hurt",
      "medical emergency", "property damage", "vandalism", "fire", "flood",
      "report", "notify", "notification", "inform", "report damage", "report incident",
      "need to report", "want to report", "reporting", "notify you", "let you know"
    ]
  },
  german: {
    "New-Policy": [
      "neue police", "versicherung abschließen", "police kaufen", "versicherung kaufen",
      "versicherungsantrag", "neue versicherung", "anmelden", "abschluss", "police eröffnen",
      "deckung starten", "antrag stellen", "kaufen möchte", "kaufen interessiert", "angebot"
    ],
    "Manage-Policy": [
      "police ändern", "versicherung anpassen", "deckung ändern", "police kündigen",
      "adresse ändern", "begünstigten ändern", "policenverwaltung", "kündigen", "anpassung",
      "details ändern", "informationen aktualisieren", "überarbeiten", "policenänderung",
      "iban ändern", "bankverbindung ändern", "kontodaten", "neue adresse", "umzug",
      "adresse aktualisieren", "zahlung ändern", "zahlungsmethode", "bankdaten",
      "meine adresse ändern", "meine iban ändern", "meine bankverbindung"
    ],
    "General-Policy-Questions": [
      "was ist versichert", "deckungsfrage", "policendetails", "prämie", "selbstbehalt",
      "wie funktioniert", "deckung erklären", "versicherungsinformationen", "verständnis",
      "klärung", "was bedeutet", "gedeckt durch", "versicherung deckt", "leistungen",
      "bedingungen", "konditionen",
      "was passiert wenn", "was wäre wenn", "theoretisch", "hypothetisch", "angenommen",
      "im falle", "falls", "wenn ich", "würde gedeckt", "würde das", "deckt es"
    ],
    "First-Notice-Of-Loss": [
      "schaden", "unfall", "verlust", "schadenfall", "schadenmeldung", "unfall melden",
      "gestohlen", "diebstahl", "verletzung", "kaputt", "kollision", "zusammenstoß",
      "verletzt", "notfall", "sachschaden", "vandalismus", "brand", "hochwasser",
      "melden", "notifizieren", "benachrichtigen", "mitteilen", "schaden melden",
      "vorfall melden", "muss melden", "möchte melden", "meldung", "informieren",
      "bescheid geben", "durchgeben", "anzeigen"
    ]
  }
};

/**
 * Detects if the text is in German or English
 * Returns 'german' or 'english', defaults to 'german' if unclear
 */
export function detectLanguage(text: string): 'german' | 'english' {
  const lowerText = text.toLowerCase();

  let germanScore = 0;
  let englishScore = 0;

  // Check for German umlauts (ü, ö, ä) - strong indicator of German
  const germanUmlauts = ['ü', 'ö', 'ä'];
  germanUmlauts.forEach(umlaut => {
    if (text.includes(umlaut)) {
      germanScore += 5; // Heavy weight for umlauts
      console.log(`🔤 Found German umlaut: ${umlaut} (+5 German score)`);
    }
  });

  // Check for ß (German sharp s)
  if (text.includes('ß')) {
    germanScore += 5;
    console.log(`🔤 Found German ß (+5 German score)`);
  }

  // Check for capitalized words not at the beginning of sentences
  // German capitalizes all nouns
  const sentences = text.split(/[.!?]\s+/);
  let capitalizedMidSentence = 0;

  sentences.forEach(sentence => {
    const words = sentence.trim().split(/\s+/);
    // Skip first word (sentence start) and check rest for capitalization
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      // Check if word starts with capital letter and is at least 3 chars (avoid acronyms)
      if (word.length >= 3 && /^[A-ZÄÖÜ]/.test(word) && !/^[A-ZÄÖÜ]+$/.test(word)) {
        capitalizedMidSentence++;
      }
    }
  });

  if (capitalizedMidSentence > 0) {
    germanScore += capitalizedMidSentence * 2;
    console.log(`🔤 Found ${capitalizedMidSentence} capitalized mid-sentence words (+${capitalizedMidSentence * 2} German score)`);
  }

  // Count how many common words appear in the text
  const words = lowerText.split(/\s+/);
  const wordSet = new Set(words);

  let germanMatches1k = 0;
  let englishMatches1k = 0;
  let germanMatches10k = 0;
  let englishMatches10k = 0;

  // Check against top 1000 common words (full weight: 1 point per match)
  COMMON_GERMAN_WORDS.forEach(word => {
    if (wordSet.has(word.toLowerCase())) germanMatches1k++;
  });

  COMMON_ENGLISH_WORDS.forEach(word => {
    if (wordSet.has(word.toLowerCase())) englishMatches1k++;
  });

  // Check against top 10k common words (lower weight: 0.2 points per match)
  COMMON_GERMAN_WORDS_10K.forEach(word => {
    if (wordSet.has(word.toLowerCase())) germanMatches10k++;
  });

  COMMON_ENGLISH_WORDS_10K.forEach(word => {
    if (wordSet.has(word.toLowerCase())) englishMatches10k++;
  });

  // Add weighted matches to scores
  const german1kScore = germanMatches1k * 1;
  const english1kScore = englishMatches1k * 1;
  const german10kScore = germanMatches10k * 0.2;
  const english10kScore = englishMatches10k * 0.2;

  germanScore += german1kScore + german10kScore;
  englishScore += english1kScore + english10kScore;

  console.log(`📝 Word matches (1k) - German: ${germanMatches1k}, English: ${englishMatches1k}`);
  console.log(`📝 Word matches (10k) - German: ${germanMatches10k}, English: ${englishMatches10k}`);
  console.log(`📝 Weighted scores - German: +${(german1kScore + german10kScore).toFixed(1)}, English: +${(english1kScore + english10kScore).toFixed(1)}`);

  console.log(`📊 Language detection scores - German: ${germanScore}, English: ${englishScore}`);

  // Default to german if unclear
  return englishScore > germanScore ? 'english' : 'german';
}

/**
 * Validates if a string is valid JSON and has expected keys
 */
function validateJSON(jsonString: string): LLMResponse | null {
  try {
    // Strip markdown code blocks if present
    let cleanedString = jsonString.trim();
    if (cleanedString.startsWith('```json')) {
      cleanedString = cleanedString.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
    } else if (cleanedString.startsWith('```')) {
      cleanedString = cleanedString.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const parsed = JSON.parse(cleanedString);

    // Check for required keys
    const requiredKeys = [
      "New-Policy-Probability", "New-Policy-Confidence",
      "Manage-Policy-Probability", "Manage-Policy-Confidence",
      "General-Policy-Questions-Probability", "General-Policy-Questions-Confidence",
      "First-Notice-Of-Loss-Probability", "First-Notice-Of-Loss-Confidence",
      "Other-Probability", "Other-Confidence",
      "category"
    ];

    const hasAllKeys = requiredKeys.every(key => key in parsed);

    if (!hasAllKeys) {
      console.log("❌ Missing required keys in JSON response");
      return null;
    }

    // Validate category value
    const validCategories: Category[] = [
      "New-Policy", "Manage-Policy", "General-Policy-Questions",
      "First-Notice-Of-Loss", "Other"
    ];

    if (!validCategories.includes(parsed.category)) {
      console.log("❌ Invalid category value in JSON response");
      return null;
    }

    return parsed as LLMResponse;
  } catch (error) {
    console.log("❌ JSON parsing failed:", error);
    return null;
  }
}

/**
 * Keyword-based classification fallback
 */
function keywordBasedClassification(text: string, language: 'german' | 'english'): Category {
  const lowerText = text.toLowerCase();
  const keywordSet = KEYWORDS[language];

  const matches: { [key: string]: number } = {
    "New-Policy": 0,
    "Manage-Policy": 0,
    "General-Policy-Questions": 0,
    "First-Notice-Of-Loss": 0
  };

  // Count keyword matches for each category
  Object.entries(keywordSet).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        matches[category]++;
      }
    });
  });

  console.log("🔍 Keyword matches:", matches);

  // Find category with most matches
  let maxMatches = 0;
  let bestCategory: Category = "Other";

  Object.entries(matches).forEach(([category, count]) => {
    if (count > maxMatches) {
      maxMatches = count;
      bestCategory = category as Category;
    }
  });

  console.log(`📊 Keyword-based classification: ${bestCategory} (${maxMatches} matches)`);

  return bestCategory;
}

/**
 * Calls the LLM via OpenRouter API with Langfuse logging
 */
async function classifyWithLLM(text: string, trace?: any): Promise<LLMResponse | null> {
  const apiKey = process.env.OPENROUTER_KEY;

  if (!apiKey) {
    console.error("❌ OPENROUTER_KEY not found in environment variables");
    return null;
  }

  const startTime = Date.now();
  const startTimestamp = new Date().toISOString();
  console.log(`⏱️  [${startTimestamp}] Starting LLM API call...`);

  const model = "google/gemini-2.5-flash-lite";
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: text }
  ];

  // Create Langfuse generation span
  const generation = trace?.generation({
    name: "insurance-triage-classification",
    model: model,
    modelParameters: {
      temperature: 0,
      maxTokens: 500
    },
    input: messages
  });

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages
      })
    });

    const endTime = Date.now();
    const endTimestamp = new Date().toISOString();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`⏱️  [${endTimestamp}] LLM API call completed in ${duration} seconds`);

    if (!response.ok) {
      console.error("❌ OpenRouter API error:", response.status, response.statusText);
      const errorBody = await response.text();
      console.error("📄 Error response body:", errorBody);

      generation?.end({
        level: "ERROR",
        statusMessage: `HTTP ${response.status}: ${response.statusText}`
      });

      try {
        const errorJson = JSON.parse(errorBody);
        console.error("📋 Parsed error details:", JSON.stringify(errorJson, null, 2));
      } catch {
        // Error body wasn't JSON, already logged as text
      }
      return null;
    }

    const data: any = await response.json();
    console.log("📦 Full API response:", JSON.stringify(data, null, 2));

    const llmOutput = data.choices?.[0]?.message?.content;

    if (!llmOutput) {
      console.error("❌ No content in LLM response");
      console.error("📋 Full data object:", JSON.stringify(data, null, 2));

      generation?.end({
        level: "ERROR",
        statusMessage: "No content in LLM response"
      });

      return null;
    }

    console.log("🤖 Raw LLM response:", llmOutput);

    const validatedResponse = validateJSON(llmOutput);

    // Log generation completion to Langfuse
    generation?.end({
      output: llmOutput,
      usage: {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0
      },
      metadata: {
        category: validatedResponse?.category,
        validJson: validatedResponse !== null
      }
    });

    return validatedResponse;
  } catch (error) {
    const errorTime = Date.now();
    const errorTimestamp = new Date().toISOString();
    const errorDuration = ((errorTime - startTime) / 1000).toFixed(2);
    console.error(`⏱️  [${errorTimestamp}] LLM API call failed after ${errorDuration} seconds`);
    console.error("❌ Error calling LLM:", error);

    generation?.end({
      level: "ERROR",
      statusMessage: error instanceof Error ? error.message : String(error)
    });

    if (error instanceof Error) {
      console.error("📋 Error details:", error.message);
      console.error("📋 Error stack:", error.stack);
    }
    return null;
  }
}

/**
 * Main triage function
 * @param text - The input text to classify
 * @param heuristicOnly - If true, skip LLM and use only keyword-based classification
 * @returns The classified category
 */
export async function triageConversation(
  text: string,
  heuristicOnly: boolean = false,
  userId?: string,
  sessionId?: string
): Promise<Category> {
  console.log("\n" + "=".repeat(60));
  console.log("🎯 TRIAGE CLASSIFICATION");
  console.log("=".repeat(60));
  console.log("📝 Input text:", text);
  console.log("");

  // Create Langfuse trace
  const trace = langfuse.trace({
    name: "insurance-conversation-triage",
    input: { text, heuristicOnly },
    userId: userId,
    sessionId: sessionId,
    metadata: getStandardLangfuseMetadata({
      source: "twilio-voice",
      textLength: text.length
    })
  });

  // Step 1: Detect language
  const language = detectLanguage(text);
  console.log(`🌍 Detected language: ${language}`);

  trace.update({
    metadata: getStandardLangfuseMetadata({
      source: "twilio-voice",
      textLength: text.length,
      detectedLanguage: language
    })
  });

  // Step 2: If heuristic-only mode, use keyword-based classification
  if (heuristicOnly) {
    console.log("⚡ Heuristic-only mode enabled");
    const category = keywordBasedClassification(text, language);
    console.log("=".repeat(60));
    console.log(`✅ FINAL RESULT: ${category}`);
    console.log("=".repeat(60) + "\n");

    trace.update({
      output: { category, method: "heuristic", language }
    });
    await langfuse.flushAsync();

    return category;
  }

  // Step 3: Try LLM classification
  console.log("🤖 Attempting LLM classification...");
  const llmResult = await classifyWithLLM(text, trace);

  if (llmResult) {
    console.log("✅ LLM classification successful!");
    console.log("\n📊 Probabilities and Confidence:");
    console.log(`  New-Policy: ${llmResult["New-Policy-Probability"]}% (confidence: ${llmResult["New-Policy-Confidence"]}%)`);
    console.log(`  Manage-Policy: ${llmResult["Manage-Policy-Probability"]}% (confidence: ${llmResult["Manage-Policy-Confidence"]}%)`);
    console.log(`  General-Policy-Questions: ${llmResult["General-Policy-Questions-Probability"]}% (confidence: ${llmResult["General-Policy-Questions-Confidence"]}%)`);
    console.log(`  First-Notice-Of-Loss: ${llmResult["First-Notice-Of-Loss-Probability"]}% (confidence: ${llmResult["First-Notice-Of-Loss-Confidence"]}%)`);
    console.log(`  Other: ${llmResult["Other-Probability"]}% (confidence: ${llmResult["Other-Confidence"]}%)`);
    console.log("");
    console.log("=".repeat(60));
    console.log(`✅ FINAL RESULT: ${llmResult.category}`);
    console.log("=".repeat(60) + "\n");

    trace.update({
      output: {
        category: llmResult.category,
        method: "llm",
        language,
        probabilities: {
          "New-Policy": llmResult["New-Policy-Probability"],
          "Manage-Policy": llmResult["Manage-Policy-Probability"],
          "General-Policy-Questions": llmResult["General-Policy-Questions-Probability"],
          "First-Notice-Of-Loss": llmResult["First-Notice-Of-Loss-Probability"],
          "Other": llmResult["Other-Probability"]
        }
      }
    });
    await langfuse.flushAsync();

    return llmResult.category;
  }

  // Step 4: Fallback to keyword-based classification
  console.log("⚠️  LLM classification failed, falling back to keyword-based heuristic");
  const category = keywordBasedClassification(text, language);
  console.log("=".repeat(60));
  console.log(`✅ FINAL RESULT (fallback): ${category}`);
  console.log("=".repeat(60) + "\n");

  trace.update({
    output: { category, method: "heuristic-fallback", language },
    metadata: getStandardLangfuseMetadata({
      source: "twilio-voice",
      textLength: text.length,
      detectedLanguage: language,
      llmFailed: true
    })
  });
  await langfuse.flushAsync();

  return category;
}
