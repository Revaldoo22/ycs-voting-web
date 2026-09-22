"use client";

import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { csWaLink } from "@/lib/contact";
import { ClipboardCheck, Headset } from "lucide-react";

/** Logo WhatsApp (glyph resmi, SVG) agar langsung dikenali. */
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current shrink-0" aria-hidden>
      <path d="M12.04 2a9.9 9.9 0 0 0-8.51 14.93L2 22l5.2-1.49A9.9 9.9 0 1 0 12.04 2Zm0 1.67a8.23 8.23 0 1 1-4.2 15.3l-.3-.18-3.09.88.86-3.02-.2-.31a8.23 8.23 0 0 1 6.93-12.67Zm-3.15 3.6c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.6.12.17 1.74 2.78 4.3 3.79 2.13.84 2.56.67 3.02.63.46-.04 1.49-.61 1.7-1.2.21-.59.21-1.09.15-1.2-.06-.1-.23-.17-.48-.29-.25-.13-1.49-.73-1.72-.82-.23-.08-.4-.12-.56.13-.17.25-.65.82-.8.99-.14.16-.29.19-.54.06a6.7 6.7 0 0 1-2-1.23 7.5 7.5 0 0 1-1.39-1.72c-.14-.25-.01-.39.11-.51.11-.11.25-.29.38-.44.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.55-1.36-.77-1.86-.2-.48-.4-.42-.56-.43l-.55-.05Z" />
    </svg>
  );
}

/**
 * Menu melayang (sticky) di kanan tengah layar.
 * Menyediakan 3 tombol akses cepat.
 */
export function HelpFab() {
  const pathname = usePathname();
  const t = useTranslation("helpFab");
  if (pathname?.startsWith("/admin")) return null;

  const waLink = csWaLink(t.waMessage);

  return (
    <div className="fixed right-0 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2">
      {/* Tombol 1: Daftar Peserta (Orange) */}
      <a
        href="/daftar-peserta"
        onClick={() => trackEvent("fab_daftar_click", { path: pathname ?? "" })}
        className="group flex items-center rounded-l-2xl bg-[#F59E0B] p-3 text-white shadow-md shadow-black/20 transition-all duration-300 hover:pr-5 hover:bg-[#D97706]"
        title="Daftar Peserta"
      >
        <ClipboardCheck className="h-6 w-6 shrink-0" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-xs group-hover:ml-2">
          Daftar Peserta
        </span>
      </a>

      {/* Tombol 2: Butuh Bantuan WA (Green) */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("fab_wa_click", { path: pathname ?? "" })}
        className="group flex items-center rounded-l-2xl bg-[#25D366] p-3 text-white shadow-md shadow-black/20 transition-all duration-300 hover:pr-5 hover:bg-[#1DA851]"
        title={t.label || "Bantuan WhatsApp"}
      >
        <WhatsAppIcon />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-xs group-hover:ml-2">
          {t.label || "Bantuan WhatsApp"}
        </span>
      </a>

      {/* Tombol 3: FAQ / Konsultasi (Dark Blue) */}
      <a
        href="/faq"
        onClick={() => trackEvent("fab_faq_click", { path: pathname ?? "" })}
        className="group flex items-center rounded-l-2xl bg-[#0F4C75] p-3 text-white shadow-md shadow-black/20 transition-all duration-300 hover:pr-5 hover:bg-[#0A3350]"
        title="Pusat Bantuan & FAQ"
      >
        <Headset className="h-6 w-6 shrink-0" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-xs group-hover:ml-2">
          Pusat Bantuan
        </span>
      </a>
    </div>
  );
}
