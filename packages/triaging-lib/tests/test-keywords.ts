import { triageConversation } from '../src/triage/triage.js';

console.log("\n🧪 Testing new keywords...\n");

// Test Manage-Policy with IBAN change (German)
console.log("TEST 1: IBAN ändern");
const result1 = await triageConversation("Ich möchte meine IBAN ändern", true);
console.log(`Result: ${result1}\n`);

// Test General-Policy-Questions with hypothetical (German)
console.log("TEST 2: Hypothetical question");
const result2 = await triageConversation("Was passiert wenn ich einen Unfall habe?", true);
console.log(`Result: ${result2}\n`);

// Test First-Notice-Of-Loss with melden (German)
console.log("TEST 3: Schaden melden");
const result3 = await triageConversation("Ich muss einen Schaden melden", true);
console.log(`Result: ${result3}\n`);

// Test Manage-Policy with address change (English)
console.log("TEST 4: Change address");
const result4 = await triageConversation("I need to update my address", true);
console.log(`Result: ${result4}\n`);
