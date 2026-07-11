"use client";

import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/utils";

const ADMIN_WA_LINK =
  "https://wa.me/628888555591?text=" +
  encodeURIComponent(
    "Halo Admin YCS, saya butuh bantuan terkait web voting Youth Character Summit.",
  );

/** Logo WhatsApp (glyph resmi, SVG) agar langsung dikenali. */
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M12.04 2a9.9 9.9 0 0 0-8.51 14.93L2 22l5.2-1.49A9.9 9.9 0 1 0 12.04 2Zm0 1.67a8.23 8.23 0 1 1-4.2 15.3l-.3-.18-3.09.88.86-3.02-.2-.31a8.23 8.23 0 0 1 6.93-12.67Zm-3.15 3.6c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.6.12.17 1.74 2.78 4.3 3.79 2.13.84 2.56.67 3.02.63.46-.04 1.49-.61 1.7-1.2.21-.59.21-1.09.15-1.2-.06-.1-.23-.17-.48-.29-.25-.13-1.49-.73-1.72-.82-.23-.08-.4-.12-.56.13-.17.25-.65.82-.8.99-.14.16-.29.19-.54.06a6.7 6.7 0 0 1-2-1.23 7.5 7.5 0 0 1-1.39-1.72c-.14-.25-.01-.39.11-.51.11-.11.25-.29.38-.44.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.55-1.36-.77-1.86-.2-.48-.4-.42-.56-.43l-.55-.05Z" />
    </svg>
  );
}

/**
 * Tombol bantuan melayang (sticky) di kanan bawah semua halaman voter.
 * Klik = buka chat WhatsApp admin. Disembunyikan di area admin.
 */
export function HelpFab() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <a
      href={ADMIN_WA_LINK}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("help_wa_click", { path: pathname ?? "" })}
      aria-label="Butuh bantuan? Chat admin via WhatsApp"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-[#25D366] py-2.5 pl-3 pr-4 text-sm font-semibold text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
    >
      <WhatsAppIcon />
      Butuh bantuan?
    </a>
  );
}
