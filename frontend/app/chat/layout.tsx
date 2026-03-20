"use client";

import { AuthGuardProvider } from "@/components/providers/auth-guard-provider";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuardProvider role="user" loginPath="/login">
      {children}
    </AuthGuardProvider>
  );
}
