import { detectLanguage } from '../src/triage/triage.js';

console.log("\n🧪 Testing language detection with 20 diverse examples...\n");

const testCases = [
  // German examples
  { text: "Ich möchte meine IBAN ändern", expected: "german" },
  { text: "Guten Tag", expected: "german" },
  { text: "Ich hatte gestern einen schweren Unfall auf der Autobahn und muss den Schaden an meinem Fahrzeug melden", expected: "german" },
  { text: "Die Versicherung", expected: "german" },
  { text: "Können Sie mir bitte erklären was passiert wenn ich meine Police kündigen möchte", expected: "german" },
  { text: "Meine neue Adresse ist Hauptstraße 45", expected: "german" },
  { text: "Schaden melden", expected: "german" },
  { text: "Ich bin sehr zufrieden mit meiner Krankenversicherung und möchte jetzt auch eine Hausratversicherung abschließen für mein neues Haus in München", expected: "german" },
  { text: "Was ist versichert?", expected: "german" },
  { text: "Bankverbindung ändern bitte", expected: "german" },

  // English examples
  { text: "I want to buy insurance", expected: "english" },
  { text: "Hello", expected: "english" },
  { text: "I had a terrible accident yesterday on the highway and I need to file a claim for the damage to my vehicle as soon as possible", expected: "english" },
  { text: "What is covered?", expected: "english" },
  { text: "Can you please explain what happens if I want to cancel my policy and get a refund", expected: "english" },
  { text: "My new address is Main Street", expected: "english" },
  { text: "Report damage", expected: "english" },
  { text: "I am very satisfied with my health insurance and would now like to purchase home insurance for my new house", expected: "english" },
  { text: "Update bank details", expected: "english" },
  { text: "The insurance policy covers theft and fire", expected: "english" },

  // Additional German test cases with longer sentences
  { text: "Guten Morgen, ich habe gestern Abend einen Wasserschaden in meiner Wohnung entdeckt und möchte diesen so schnell wie möglich bei Ihnen melden", expected: "german" },
  { text: "Können Sie mir bitte mitteilen welche Unterlagen ich für den Abschluss einer neuen Hausratversicherung einreichen muss", expected: "german" },
  { text: "Meine Versicherungsnummer ist 12345678 und ich möchte gerne meine monatliche Zahlungsmethode von Lastschrift auf Überweisung umstellen", expected: "german" },
  { text: "Ich bin letzte Woche umgezogen und muss daher meine neue Adresse in allen meinen Versicherungsverträgen aktualisieren lassen", expected: "german" },
  { text: "Wie hoch ist der Selbstbehalt bei meiner Kfz-Versicherung und welche Schäden sind in der Vollkaskoversicherung genau abgedeckt", expected: "german" },
  { text: "Mein Auto wurde gestern Nacht gestohlen und ich muss diesen Diebstahl umgehend melden sowie alle erforderlichen Dokumente für die Schadensregulierung einreichen", expected: "german" },
  { text: "Ich interessiere mich für eine Rechtsschutzversicherung und würde gerne ein unverbindliches Angebot mit allen verfügbaren Leistungspaketen erhalten", expected: "german" },
  { text: "Was passiert wenn ich meine monatlichen Beiträge nicht rechtzeitig bezahle und wie lange habe ich Zeit um die ausstehenden Beträge nachzuzahlen", expected: "german" },
  { text: "Ich hatte vor drei Tagen einen Auffahrunfall auf der Autobahn bei dem sowohl mein Fahrzeug als auch das andere Auto beschädigt wurden", expected: "german" },
  { text: "Können Sie mir erklären wie der Prozess für eine Schadensmeldung funktioniert und welche Fristen ich dabei unbedingt einhalten muss", expected: "german" },

  // Additional English test cases with longer sentences
  { text: "Good morning, I discovered water damage in my apartment yesterday evening and would like to report this to you as soon as possible", expected: "english" },
  { text: "Could you please tell me which documents I need to submit in order to purchase a new home contents insurance policy", expected: "english" },
  { text: "My insurance number is 12345678 and I would like to change my monthly payment method from direct debit to bank transfer", expected: "english" },
  { text: "I moved last week and therefore need to update my new address in all of my insurance contracts and policies", expected: "english" },
  { text: "What is the deductible amount on my car insurance policy and which damages are exactly covered under the comprehensive coverage", expected: "english" },
  { text: "My car was stolen last night and I need to report this theft immediately as well as submit all required documents for the claims processing", expected: "english" },
  { text: "I am interested in legal protection insurance and would like to receive a non-binding quote with all available coverage packages", expected: "english" },
  { text: "What happens if I do not pay my monthly premiums on time and how long do I have to pay the outstanding amounts", expected: "english" },
  { text: "I had a rear-end collision on the highway three days ago in which both my vehicle and the other car were damaged", expected: "english" },
  { text: "Can you explain to me how the process for filing a claim works and which deadlines I absolutely must comply with", expected: "english" },
];

let correctCount = 0;
let incorrectCount = 0;

console.log(`${"=".repeat(80)}`);
console.log("LANGUAGE DETECTION TEST RESULTS");
console.log(`${"=".repeat(80)}\n`);

for (let i = 0; i < testCases.length; i++) {
  const testCase = testCases[i];
  const detected = detectLanguage(testCase.text);
  const isCorrect = detected === testCase.expected;

  if (isCorrect) {
    correctCount++;
  } else {
    incorrectCount++;
  }

  const statusIcon = isCorrect ? "✅" : "❌";
  const textPreview = testCase.text.substring(0, 50) + (testCase.text.length > 50 ? "..." : "");

  console.log(`${statusIcon} Test ${(i + 1).toString().padStart(2, " ")}: Expected: ${testCase.expected.padEnd(7)} | Detected: ${detected.padEnd(7)} | "${textPreview}"`);
}

const totalTests = testCases.length;
const accuracy = ((correctCount / totalTests) * 100).toFixed(1);

console.log(`\n${"=".repeat(80)}`);
console.log(`📊 FINAL SCORE: ${correctCount}/${totalTests} correct (${accuracy}% accuracy)`);
console.log(`   ✅ Correct: ${correctCount}`);
console.log(`   ❌ Incorrect: ${incorrectCount}`);
console.log(`${"=".repeat(80)}\n`);
