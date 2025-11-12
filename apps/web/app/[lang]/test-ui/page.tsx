import { ChatInterface } from "@/components/ChatInterface";
import { localeCodeToLocale } from "@/lib/utils";
import { LocaleCode } from "@renisa-ai/config/types";

export default async function TestUIPage({
  params,
}: {
  params: Promise<{ lang: LocaleCode }>;
}) {
  const { lang } = await params;
  return <ChatInterface locale={localeCodeToLocale(lang)} />;
}
