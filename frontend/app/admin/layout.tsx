import { SetupGuardProvider } from "@/components/providers/setup-guard-provider";
import { AdminLayoutContent } from "@/components/admin/admin-layout-content";
import { AdminAuthWrapper } from "@/components/providers/admin-auth-wrapper";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthWrapper>
      <SetupGuardProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </SetupGuardProvider>
    </AdminAuthWrapper>
  );
}
