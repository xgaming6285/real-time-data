import { AdminProvider } from "@/context/AdminContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <div className="fixed inset-0 bg-background overflow-auto">
        {children}
      </div>
    </AdminProvider>
  );
}
