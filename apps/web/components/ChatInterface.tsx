"use client";

import { i18n } from "@/lib/i18n";
import { getLlmTransport } from "@/lib/request";
import { openInNewTab } from "@/lib/utils";
import { LegalPages, SessionData } from "@/types";
import { useChat } from "@ai-sdk/react";
import { Locale, UIMessage } from "@renisa-ai/config/types";
import { Logger } from "@renisa-ai/utils";
import { ChatRequestOptions, generateId } from "ai";
import { useEffect, useRef, useState } from "react";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { DebugModal } from "./DebugModal";
import { InactivityTimeout } from "./InactivityTimeout";
import { LegalModal } from "./LegalModal";
import { MenuDrawer } from "./MenuDrawer";
import { PreviewPaneModal } from "./PreviewPaneModal";

export const logger = new Logger(
  process.env.NEXT_PUBLIC_LOG_LEVEL,
  "ChatInterface"
);

export interface ChatInterfaceProps {
  locale: Locale;
}

export function ChatInterface({ locale }: ChatInterfaceProps) {
  const threadId = useRef(generateId());
  const [sessionData, setSessionData] = useState<SessionData>({
    version: 0,
    threadId: threadId.current,
  });
  const [input, setInput] = useState("");
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [visibleLegalPage, setVisibleLegalPage] = useState<
    LegalPages | undefined
  >();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat<UIMessage>({
    id: threadId.current,
    messages: [
      {
        id: generateId(),
        role: "assistant",
        parts: [
          {
            type: "text",
            text: i18n[locale].welcomeMessage,
          },
        ],
      },
    ],
    transport: getLlmTransport(locale),
    experimental_throttle: 100,
    onData(data) {
      console.info("data", data);
    },
    onToolCall({ toolCall }) {
      console.info("toolCall", toolCall);
    },
    onError: (error: Error) => {
      console.error("Error in useChat", error);
      setIsProcessing(false);
    },
    onFinish: (message) => {
      console.info("onFinish", message);
      setIsProcessing(false);
    },
  });

  useEffect(() => {
    scrollToBottom();
    // Reset processing state when new messages arrive
    if (isProcessing && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // If the last message is from assistant, we have a response, so reset processing
      if (lastMessage.role === "assistant") {
        setIsProcessing(false);
      }
    }
  }, [messages, isProcessing]);

  function scrollToBottom(): void {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const handleChange = (text: string) => {
    // Handle any additional input change logic here
  };

  const handleSendMessage = (text: string) => {
    try {
      setInput("");
      setIsProcessing(true);
      sendMessage({ text });
    } catch (error) {
      console.error("Error processing message:", error);
      setIsProcessing(false);
    }
  };

  async function handleUICommand(data: { label: string; href?: string }) {
    if (isProcessing || status === "submitted") return;

    setIsProcessing(true);

    if (data.href) {
      openInNewTab(data.href);
      sendMessage({
        text: data.label,
        metadata: {
          instructions: `Button clicked: ${data.label}. Proceed with the next step.`,
        },
      });
      return;
    }
    sendMessage({ text: data.label });
  }

  function handleLegalPress(type?: LegalPages | "bug") {
    if (type === "bug") {
      setShowDebug(true);
      return;
    }
    setVisibleLegalPage(type);
  }

  function handleSessionExpired() {
    const newThreadId = generateId();
    threadId.current = newThreadId;
    setSessionData({
      version: sessionData.version + 1,
      threadId: newThreadId,
    });
    console.info("Session expired, new threadId generated", {
      newThreadId,
      version: sessionData.version + 1,
    });
  }

  return (
    <div className="relative w-full max-w-[550px] mx-auto bg-[#ebf3ff] h-screen flex flex-col resize-x overflow-hidden" style={{ minWidth: '320px' }}>
      {/* Navigation Bar */}
      <ChatHeader
        className="bg-[#ebf3ff] flex-shrink-0"
        onMenuClick={() => setIsMenuOpen(true)}
      />

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-12">
        <div className="space-y-2">
          {messages.map((message, index) => {
            // Only allow interactions on the last assistant message
            const lastAssistantIndex = messages.map(m => m.role).lastIndexOf("assistant");
            const isLastAssistant = message.role === "assistant" && index === lastAssistantIndex;
            // Disable if not the last assistant message, OR if chat is currently processing
            const shouldDisable = message.role === "assistant" && (!isLastAssistant || isProcessing || status === "submitted");

            return (
              <ChatMessage
                key={message.id || index}
                message={message}
                isLast={index === messages.length - 1}
                handleUICommand={handleUICommand}
                locale={locale}
                disabled={shouldDisable}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Footer */}
      <ChatInput
        input={input}
        setInput={setInput}
        onSendMessage={handleSendMessage}
        status={status}
        placeholder={i18n[locale].input.placeholder}
        onChange={handleChange}
        onButtonClick={handleLegalPress}
        locale={locale}
        className="bg-[#ebf3ff] flex-shrink-0"
      />

      {/* Modals */}
      <PreviewPaneModal
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        onUserInfoChange={(userInfo) => {
          // Handle user info changes
        }}
      />
      <LegalModal
        pageType={visibleLegalPage}
        onClose={() => setVisibleLegalPage(undefined)}
        locale={locale}
      />
      <DebugModal
        visible={showDebug}
        onClose={() => setShowDebug(false)}
        debugData={sessionData}
      />
      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onLegalClick={handleLegalPress}
        locale={locale}
      />
      <InactivityTimeout
        locale={locale}
        warningTimeMinutes={12}
        logoutTimeMinutes={15}
        onSessionExpired={handleSessionExpired}
      />
    </div>
  );
}
