import { Locale, UIMessage } from "@renisa-ai/config/types";
import { DefaultChatTransport } from "ai";
import { getUserResource } from "./resource";
import { localeToLocaleCode } from "@renisa-ai/utils";

export function getLlmTransport(locale: Locale) {
  return new DefaultChatTransport({
    api: `${process.env.NEXT_PUBLIC_MASTRA_URL}/${localeToLocaleCode(locale)}/chat`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_MASTRA_BEARER_TOKEN}`,
    },
    prepareSendMessagesRequest: ({ id, messages, headers, ...rest }) => {
      const message = messages[messages.length - 1] as UIMessage;
      return {
        headers: {
          ...headers,
          "X-Session-ID": id,
        },
        ...rest,
        body: {
          ...rest.body,
          messages: [message],
          memory: {
            thread: id,
            resource: getUserResource(),
          },
        },
      };
    },
  });
}
