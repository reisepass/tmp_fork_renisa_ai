import { Mastra } from "@mastra/core/mastra";
import { Context } from "hono";

/**
 * Handler for /twilio/voice - Initial greeting
 */
export async function handleVoice(c: Context) {
  const twilio = await import("twilio");
  const VoiceResponse = twilio.twiml.VoiceResponse;

  const mastra = c.get("mastra") as Mastra;
  const logger = mastra.getLogger();

  // Get form data from Twilio
  const formData = await c.req.parseBody();
  const callSid = String(formData.CallSid || "unknown");
  const from = String(formData.From || "unknown");

  logger.info("Twilio voice endpoint called", { callSid, from });

  // Build TwiML response with greeting
  const response = new VoiceResponse();
  response
    .gather({ action: "/twilio/respond", input: ["speech"] })
    .say({ language: "de-DE" }, "Hallo, wie kann ich Ihnen helfen?");

  logger.info("Sending greeting TwiML", { callSid });

  return c.body(response.toString(), 200, { "Content-Type": "text/xml" });
}

/**
 * Handler for /twilio/respond - Process user speech and respond
 */
export async function handleRespond(c: Context) {
  const twilio = await import("twilio");
  const VoiceResponse = twilio.twiml.VoiceResponse;

  const mastra = c.get("mastra") as Mastra;
  const logger = mastra.getLogger();

  // Get form data from Twilio
  const formData = await c.req.parseBody();
  const callSid = String(formData.CallSid || "unknown");
  const speechResult = String(formData.SpeechResult || "");
  const from = String(formData.From || "unknown");

  logger.info("Twilio respond endpoint called", {
    callSid,
    speechResult,
    from,
  });

  // Handle empty speech
  if (!speechResult) {
    logger.warn("No speech result received", { callSid });
    const response = new VoiceResponse();
    response
      .gather({ action: "/twilio/respond", input: ["speech"] })
      .say(
        { language: "de-DE" },
        "Entschuldigung, ich konnte Sie nicht verstehen. " +
          "Bitte versuchen Sie es erneut."
      );
    return c.body(response.toString(), 200, { "Content-Type": "text/xml" });
  }

  try {
    // Get orchestrator agent
    const agent = mastra.getAgent("orchestratorAgent");
    if (!agent) {
      throw new Error("orchestratorAgent not found");
    }

    logger.info("Calling orchestrator agent", { from, callSid });

    // Call agent with user message
    const response = await agent.generate(speechResult, {
      memory: { thread: callSid, resource: from },
      tracingOptions: {
        metadata: {
          callSid,
          from,
          channel: "twilio-voice",
        },
      },
    });

    const agentMessage =
      response.text || "Es tut mir leid, ich konnte keine Antwort generieren.";

    logger.info("Agent response received", { callSid, agentMessage });

    // Build TwiML response - say agent message and gather next input
    const twiml = new VoiceResponse();
    twiml
      .gather({ action: "/twilio/respond", input: ["speech"] })
      .say({ language: "de-DE" }, agentMessage);

    return c.body(twiml.toString(), 200, { "Content-Type": "text/xml" });
  } catch (error) {
    logger.error("Error processing speech", { callSid, error });

    const twiml = new VoiceResponse();
    twiml.say(
      { language: "de-DE" },
      "Es tut mir leid, es gab einen technischen Fehler. " +
        "Bitte versuchen Sie es später erneut."
    );

    return c.body(twiml.toString(), 200, { "Content-Type": "text/xml" });
  }
}
