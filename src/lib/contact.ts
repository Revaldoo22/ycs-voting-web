/**
 * Kontak CS satu-satunya. Sebelumnya nomor ini ditulis ulang di tiga tempat
 * dengan dua nomor berbeda, jadi sekali ganti selalu ada yang ketinggalan.
 * Ubah di sini saja.
 */

/** Nomor CS format internasional tanpa tanda plus, untuk link wa.me. */
export const CS_WA = "6287848775292";

/** Nomor CS untuk ditampilkan ke pengguna. */
export const CS_WA_DISPLAY = "+62 878-4877-5292";

/** Bangun link chat WhatsApp CS, pesan awal opsional. */
export function csWaLink(message?: string): string {
  const base = `https://wa.me/${CS_WA}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
