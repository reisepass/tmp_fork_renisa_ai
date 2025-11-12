// Main export file for triaging library
export { triageConversation, detectLanguage } from './triage/triage.js';
export type { Category, LLMResponse } from './triage/triage.js';
export { evaluateClaim } from './claim-eval.js';
export type { ClaimDecision, LLMClaimResponse } from './claim-eval.js';
