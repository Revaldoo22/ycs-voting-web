"use client";

import { AdminSidebar, SidebarProvider, useSidebarRingkas } from "@/components/admin-sidebar";
import { AdminAssistant } from "@/components/admin-assistant";
import { cn } from "@/lib/utils";

/** Dipisah dari layout karena perlu membaca konteks di dalam provider. */
function Isi({ children }: { children: React.ReactNode }) {
  const ringkas = useSidebarRingkas();
  return (
    <div className="min-h-screen bg-muted/20">
      <AdminSidebar />
      {/* Konten bergeser selebar sidebar di desktop, mengikuti keadaan
          ringkasnya supaya tidak meninggalkan celah kosong. */}
      <main
        className={cn(
          "space-y-6 p-4 transition-[margin] duration-200 sm:p-6 lg:p-8",
          ringkas ? "lg:ml-16" : "lg:ml-60",
        )}
      >
        {children}
      </main>
      {/* Di layout, bukan per halaman: asisten perlu ada di semua halaman
          admin dan mendeteksi sendiri halaman mana yang sedang dibuka. */}
      <AdminAssistant />
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Isi>{children}</Isi>
    </SidebarProvider>
  );
}
