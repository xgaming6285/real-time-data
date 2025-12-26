import { AdminProvider } from '@/context/AdminContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-[var(--bg-primary)] overflow-auto">
        {children}
      </div>
    </AdminProvider>
  );
}

