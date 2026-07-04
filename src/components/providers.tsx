"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/confirm-dialog";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={client}>
        <ConfirmProvider>{children}</ConfirmProvider>
        <Toaster
          position="top-center"
          duration={3500}
          gap={10}
          toastOptions={{
            // Kartu putih bersih + aksen tepi kiri berwarna per jenis —
            // serasi tema YCS (radius 2xl, shadow lembut, font ikut app).
            unstyled: true,
            classNames: {
              // Pill gelap kompak — netral, tanpa aksen ramai; jenis toast
              // cukup dibedakan warna ikonnya.
              toast:
                "group pointer-events-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-xl bg-foreground py-2.5 pl-3 pr-4 font-sans text-sm font-medium text-background shadow-lg",
              icon: "shrink-0 [&>svg]:h-4 [&>svg]:w-4 group-data-[type=success]:text-emerald-400 group-data-[type=error]:text-red-400 group-data-[type=warning]:text-amber-400 group-data-[type=info]:text-sky-400",
              title: "leading-snug",
              description: "text-xs opacity-70",
              actionButton:
                "rounded-lg bg-background/15 px-2.5 py-1 text-xs font-semibold",
              cancelButton:
                "rounded-lg px-2.5 py-1 text-xs font-medium opacity-70",
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
