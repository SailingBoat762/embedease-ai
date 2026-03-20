"use client";

import { usePathname } from "next/navigation";
import { AuthGuardProvider } from "@/components/providers/auth-guard-provider";

const PUBLIC_ADMIN_PATHS = ["/admin/login"];

export function AdminAuthWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPublic = PUBLIC_ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <AuthGuardProvider role="admin" loginPath="/admin/login">
      {children}
    </AuthGuardProvider>
  );
}
