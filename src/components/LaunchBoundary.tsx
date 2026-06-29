import type { ReactNode } from "react";

// Kept as a lightweight compatibility boundary so existing route composition
// remains stable. Foodiz authentication is now open throughout France; city
// coverage only controls catalog availability, never account access.
export default function LaunchBoundary({ children }: { children: ReactNode }) {
  return children;
}
