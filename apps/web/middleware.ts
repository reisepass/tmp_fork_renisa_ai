import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { NextRequest } from "next/server";
import { Locale } from "@renisa-ai/config/types";
import { localeToLocaleCode } from "@renisa-ai/utils";
import { defaultLocale, localeEnum } from "@renisa-ai/config/schema";

export function middleware(request: NextRequest) {
  // Check if there is any supported locale in the pathname
  const { pathname } = request.nextUrl;
  const pathnameHasLocale = Object.values(localeEnum.enum).some((locale) => {
    const localeCode = localeToLocaleCode(locale);
    return (
      pathname.startsWith(`/${localeCode}/`) || pathname === `/${localeCode}`
    );
  });
  if (pathnameHasLocale) return;

  // Continue if there is no locale
  try {
    const locale = getLocale(request);
    request.nextUrl.pathname = `/${localeToLocaleCode(locale)}${pathname}`;
    // e.g. incoming request is /products
    // The new URL is now /en-US/products
    return Response.redirect(request.nextUrl);
  } catch (error) {
    console.warn(error);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /api routes
     * - /_next (Next.js internals)
     * - /_static (inside /public)
     * - Static files (.*\\..*) in the root public folder
     */
    "/((?!api|_next|_static|.*\\..*).*)",
  ],
};

function getLocale(request: NextRequest) {
  try {
    const languages = new Negotiator({
      headers: Object.fromEntries(request.headers.entries()),
    }).languages();

    return match(
      languages,
      Object.values(localeEnum.enum),
      defaultLocale.value
    ) as Locale;
  } catch {
    return defaultLocale.value;
  }
}
