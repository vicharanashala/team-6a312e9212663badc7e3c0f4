import { getSession } from "@/lib/adminAuth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar superAdminOnly={session.role === "super_admin"} />
      <div className="pl-64 transition-all duration-300">
        <AdminTopBar admin={session} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}