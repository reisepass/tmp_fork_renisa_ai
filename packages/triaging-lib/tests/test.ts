import { triageConversation } from '../src/triage/triage.js';

// Test example
const result = await triageConversation("I want to buy a new car insurance policy");
console.log(`\n🎯 Final category returned: ${result}`);
