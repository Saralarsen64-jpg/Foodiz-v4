import { ReactNode } from "react";

export default function LaunchBoundary({ children }: { children: ReactNode }) {
  // Public registration is now open nationwide. Table-specific RLS policies,
  // role guards and validation statuses remain responsible for authorization.
  return <>{children}</>;
}
