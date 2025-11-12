import { i18n } from "@/lib/i18n";
import { Locale, UIMessage } from "@renisa-ai/config/types";
import { JSONParseSafe } from "@renisa-ai/utils";
import { ChatStatus } from "ai";
import { MessageCircleWarningIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Message, MessageAvatar, MessageContent } from "./message";
import { Response } from "./response";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface ChatMessageProps {
  message: UIMessage;
  error?: Error;
  isLast: boolean;
  handleUICommand: (data: { label: string; href?: string }) => void;
  locale: Locale;
  disabled?: boolean;
}

function TypingIndicator() {
  return (
    <div className="flex items-center justify-start py-2">
      <div className="loader"></div>
    </div>
  );
}

export function ChatMessage({
  message,
  error,
  isLast,
  handleUICommand,
  locale,
  disabled = false,
}: ChatMessageProps) {
  // Helper to check if current message has JSON
  const messageHasJSON = () => {
    if (message.role !== "assistant") return false;
    const textParts = message.parts.filter(p => p.type === "text");
    return textParts.some(part => {
      if (!('text' in part)) return false;
      const trimmed = part.text.trim();
      return trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('```');
    });
  };

  // Track if we should delay displaying JSON content
  // Default to true for user messages, false for assistant to check first
  const [showDelayedContent, setShowDelayedContent] = useState(message.role !== "assistant");

  // Function to check if text looks like intermediate JSON/structured data that might be replaced
  function looksLikeIntermediateJSON(text: string): boolean {
    const trimmed = text.trim();

    // Quick bail if empty
    if (!trimmed) return false;

    // 1. Catch markdown code blocks immediately - even partial ones being streamed
    if (trimmed.startsWith('```')) {
      return true;
    }

    // 2. Catch JSON objects/arrays immediately - even just the opening brace/bracket
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return true;
    }

    // 3. Check for common JSON field names that indicate internal structured responses
    const jsonFieldPatterns = [
      'nextQuestion',
      'extractedData',
      'internalReasoning',
      'metadata',
      'reasoning',
      'thoughts',
      'internal',
    ];
    if (jsonFieldPatterns.some(field => trimmed.includes(`"${field}"`))) {
      return true;
    }

    // 4. High density of JSON-like characters (quotes, colons, braces)
    const jsonChars = (trimmed.match(/[{}\[\]:,"]/g) || []).length;
    const jsonCharRatio = jsonChars / trimmed.length;
    if (jsonCharRatio > 0.15) { // More than 15% JSON syntax characters
      return true;
    }

    // 5. Contains escaped quotes (common in JSON strings)
    if (trimmed.includes('\\"') || trimmed.includes("\\'")) {
      return true;
    }

    // 6. Multiple lines with key-value pair patterns
    const lines = trimmed.split('\n');
    const kvPatternLines = lines.filter(line =>
      /^\s*"[^"]+"\s*:\s*.+/.test(line)
    ).length;
    if (kvPatternLines >= 2) { // 2+ lines that look like "key": value
      return true;
    }

    return false;
  }

  // Function to extract user-facing text from potential JSON responses
  function extractDisplayText(text: string): string {
    // Check if text looks like JSON (trim whitespace first)
    let trimmed = text.trim();

    // Check if text is wrapped in markdown code blocks (```json ... ```)
    const codeBlockMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
    if (codeBlockMatch) {
      trimmed = codeBlockMatch[1].trim();
    }

    // Check if it looks like JSON
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return text;
    }

    // Try to parse as JSON
    const parsed = JSONParseSafe<{
      nextQuestion?: string;
      extractedData?: unknown;
      internalReasoning?: unknown;
    }>(trimmed);

    // If parsing failed or no nextQuestion field, return original text
    if (!parsed || !parsed.nextQuestion) {
      return text;
    }

    // Return only the nextQuestion field
    return parsed.nextQuestion;
  }

  // Effect to handle delayed display of JSON content
  useEffect(() => {
    // Reset state when message changes
    setShowDelayedContent(false);

    // Only apply delay logic to assistant messages
    if (message.role !== "assistant") {
      setShowDelayedContent(true);
      return;
    }

    const textParts = message.parts.filter(p => p.type === "text");
    if (textParts.length === 0) {
      setShowDelayedContent(true);
      return;
    }

    // Check if ANY text part contains JSON
    const hasJSON = textParts.some(part =>
      'text' in part && looksLikeIntermediateJSON(part.text)
    );

    // If we have JSON, hide content until orchestrator adds final message
    if (hasJSON) {
      // Check if there's a clean non-JSON message after the JSON
      const lastTextPart = textParts[textParts.length - 1];
      const lastText = 'text' in lastTextPart ? lastTextPart.text : '';

      // If last message is also JSON, keep hiding (orchestrator hasn't responded yet)
      if (looksLikeIntermediateJSON(lastText)) {
        // Don't show yet - wait for orchestrator
        return;
      }

      // Last message is clean text - orchestrator has rewritten, show it
      setShowDelayedContent(true);
    } else {
      // No JSON detected, show immediately
      setShowDelayedContent(true);
    }
  }, [message.parts, message.role]);

  return (
    <Message
      from={message.role}
      className={message.role === "assistant" ? "assistant" : "user"}
    >
      <MessageContent>
        {!message.parts.filter(
          (part) => part.type === "text" || part.type === "data-ui"
        ).length && <TypingIndicator />}
        {!showDelayedContent && message.role === "assistant" && <TypingIndicator />}
        {showDelayedContent && message.parts.map((part, i) => {
          switch (part.type) {
            case "text": {
              // For assistant messages with multiple text parts, only show the last one
              // (orchestrator's refined version)
              if (message.role === "assistant") {
                const textParts = message.parts.filter(p => p.type === "text");
                const isLastTextPart = textParts[textParts.length - 1] === part;
                if (!isLastTextPart) {
                  return null;
                }

                // Double-check: even if showDelayedContent is true, don't render if this part is still JSON
                if (looksLikeIntermediateJSON(part.text)) {
                  return null;
                }
              }

              const displayText = message.role === "assistant"
                ? extractDisplayText(part.text)
                : part.text;
              return (
                <Response
                  key={`${message.id}-${i}`}
                  onClick={handleUICommand}
                  disabled={disabled}
                >
                  {displayText}
                </Response>
              );
            }
          }
        })}
        {isLast && error && (
          <Alert variant="destructive" className="bg-transparent">
            <MessageCircleWarningIcon />
            <AlertTitle>{i18n[locale].chatMessage.alertTitle}</AlertTitle>
            <AlertDescription>{getError(error)}</AlertDescription>
          </Alert>
        )}
      </MessageContent>
      {message.role === "assistant" && (
        <MessageAvatar
          name={i18n[locale].chatMessage.avatarName}
          src="/logo.svg"
        />
      )}
    </Message>
  );

  function getError(error?: Error) {
    return (
      JSONParseSafe<{ details?: string }>(error?.message || "{}")?.details ||
      error?.message
    );
  }
}
