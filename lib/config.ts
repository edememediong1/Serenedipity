/**
 * Single source for brand naming and site-wide constants.
 * "Serenedipity" is the current name; change it here and it updates everywhere.
 */
export const APP_NAME = "Serenedipity";

export const APP_TAGLINE = "Clear head. Deep work.";

/** The PRD one-liner, used as the hero subhead and default meta description. */
export const APP_DESCRIPTION =
  "Tell it how you feel and what's due. It clears your head, plans your day, and keeps you focused, alone or with others.";

export const CONTACT_EMAIL = "[CONTACT_EMAIL]";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const FEATURE_FLAGS = {
  appleSignIn: process.env.NEXT_PUBLIC_ENABLE_APPLE_AUTH === "true",
  googleSignIn: process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH !== "false",
} as const;

export const PRICING = {
  monthly: 7.99,
  yearly: 59.99,
  currency: "USD",
} as const;
