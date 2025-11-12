import { i18n } from "@/lib/i18n";
import { config } from "@renisa-ai/config";
import { LocaleCode } from "@renisa-ai/config/types";
import { localeEnum } from "@renisa-ai/config/schema";
import type { Metadata } from "next";
import { Outfit, Work_Sans, Source_Serif_4 } from "next/font/google";
import { localeCodeToLocale } from "../../lib/utils";

import "../globals.css";
import "../theme.css";
import "../index.css";
import { localeToLocaleCode } from "@renisa-ai/utils";
import { EnvironmentLogger } from "@/components/EnvironmentLogger";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400"],
});

export async function generateStaticParams() {
  return Object.values(localeEnum.enum).map((lang) => ({
    lang: localeToLocaleCode(lang),
  }));
}

type Props = Readonly<{
  children: React.ReactNode;
  params: Promise<{
    lang: string;
  }>;
}>;

export async function generateMetadata(
  { params }: Props
  // parent: ResolvingMetadata
): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: config.name,
    description: i18n[localeCodeToLocale(lang as LocaleCode)].brand.subtitle,
    icons: {
      icon: "/logo.svg",
    },
  };
}

export default async function RootLayout({ children, params }: Props) {
  const { lang } = await params;
  return (
    <html lang={localeCodeToLocale(lang as LocaleCode)}>
      <body
        className={`${outfit.variable} ${workSans.variable} ${sourceSerif.variable} antialiased font-[family-name:var(--font-outfit)]`}
      >
        <EnvironmentLogger />
        {children}
      </body>
    </html>
  );
}
