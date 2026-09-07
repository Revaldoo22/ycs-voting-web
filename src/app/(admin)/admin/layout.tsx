"use client";

import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminAssistant } from "@/components/admin-assistant";

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
      {/* Di layout, bukan per halaman: asisten perlu ada di semua halaman
          admin dan mendeteksi sendiri halaman mana yang sedang dibuka. */}
      <AdminAssistant />
    </div>
  );
}
