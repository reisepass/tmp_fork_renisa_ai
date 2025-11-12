import { createAgentTool } from "./utils";

/**
 * FNOL Agent Tool Lite
 *
 * Simplified version that wraps the FNOL agent lite as a tool.
 * Data collection is handled in thread memory (like orchestrator pattern).
 *
 * Use this tool when:
 * - User mentions an incident, accident, or damage
 * - User says they want to "report a claim" or "Schaden melden"
 * - User describes something that went wrong (e.g., "I broke...", "My child damaged...")
 * - User asks about claim reporting process
 */
export const fnolToolLite = createAgentTool({
  id: "fnol-lite",
  agentName: "fnolAgentLite",
  description: `Call this tool when the user wants to report a claim (First Notice of Loss - FNOL) for their private liability insurance.

This tool handles the entire claim reporting conversation through a specialized FNOL agent that:
- Collects incident details through natural conversation
- Classifies the type of damage (object, person, building, vehicle, animal, other)
- Gathers all required information based on damage type
- Validates data accuracy (especially dates and costs)
- Avoids repetition and hallucination
- Provides empathetic, supportive communication

Use this tool when:
- User mentions an incident, accident, or damage
- User says they want to "report a claim" or "Schaden melden"
- User describes something that went wrong (e.g., "I broke...", "My child damaged...")
- User asks about claim reporting process

The tool uses simplified memory management with threadMemory for better reliability.`,
});
