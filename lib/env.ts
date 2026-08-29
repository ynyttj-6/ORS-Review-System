export const isCookieSecure = () => process.env.ORS_COOKIE_SECURE === "true";

export function publicAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
