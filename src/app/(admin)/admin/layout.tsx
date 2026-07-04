"use client";

import { AdminSidebar } from "@/components/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/20">
      <AdminSidebar />
      {/* Konten bergeser selebar sidebar di desktop. */}
      <main className="space-y-6 p-4 sm:p-6 lg:ml-60 lg:p-8">{children}</main>
    </div>
  );
}
