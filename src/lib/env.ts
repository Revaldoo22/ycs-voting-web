/**
 * Baca variabel lingkungan, perlakukan string kosong sebagai tidak diisi.
 *
 * Operator ?? hanya menangkap undefined, sedangkan Docker menyetel setiap
 * ARG yang dideklarasikan tanpa nilai menjadi string KOSONG. Akibatnya
 * nilai bawaan terlewati dan build gagal di tempat yang jauh dari
 * penyebabnya, mis. new URL("") yang hanya berkata "Invalid URL".
 */
export function env(nama: string, bawaan: string): string {
  const v = process.env[nama];
  return v && v.trim() !== "" ? v : bawaan;
}
