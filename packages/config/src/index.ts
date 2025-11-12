/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// Export all configurations
export const config = {
  name: "Alteos AI Agent",
  version: "1.0.0",
  support: {
    email: "support@alteos.com",
    phone: "+49-30-20000000",
    claimsLink: "https://alteos.com/claims",
  },
  features: {
    darkMode: true,
    notifications: true,
    analytics: process.env.NODE_ENV === "production",
  },
  validations: {
    ageMin: 18,
    ageMax: 99,
    country: "Germany",
    maxClaimCount: 2,
  },
  dateFormat: "yyyy-MM-dd",
} as const;
