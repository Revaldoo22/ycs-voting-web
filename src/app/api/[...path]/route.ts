import { type NextRequest, NextResponse } from "next/server";

/**
 * Teruskan seluruh /api/* ke backend NestJS.
 *
 * Sebelumnya ini memakai `rewrites()` di next.config, tapi rewrites
 * dievaluasi saat BUILD dan hasilnya dibekukan ke manifest. Di Docker,
 * alamat backend baru diketahui ketika container dijalankan, sehingga
 * nilai bawaan localhost:4000 ikut terkunci ke dalam image dan
 * API_PROXY_URL di environment tidak pernah terbaca.
 *
 * Route handler dieksekusi per permintaan, jadi process.env dibaca saat
 * itu juga. Dari sisi browser tidak ada yang berubah: /api/* tetap satu
 * domain dengan halaman, jadi cookie login bekerja seperti biasa.
 */
export const dynamic = "force-dynamic";

function backend(): string {
  const v = process.env.API_PROXY_URL;
  return (v && v.trim() !== "" ? v : "http://localhost:4000").replace(
    /\/+$/,
    "",
  );
}

/** Header yang tidak boleh diteruskan apa adanya. */
const LEWATI_PERMINTAAN = new Set([
  // Host harus milik backend, bukan domain frontend.
  "host",
  // Panjang dan encoding dihitung ulang oleh fetch.
  "content-length",
  "connection",
  // Kompresi ditangani lapisan fetch; meneruskannya membuat body ganda
  // terkompresi dan tak bisa dibaca klien.
  "accept-encoding",
]);

const LEWATI_BALASAN = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
]);

async function teruskan(req: NextRequest, path: string[]) {
  const tujuan = `${backend()}/api/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((nilai, nama) => {
    if (!LEWATI_PERMINTAAN.has(nama.toLowerCase())) headers.set(nama, nilai);
  });

  // IP asli voter dipakai backend untuk batas harian per IP. Tanpa ini
  // setiap permintaan terlihat berasal dari container frontend, sehingga
  // seluruh voter berbagi satu jatah.
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) {
    headers.set("x-forwarded-for", ip);
    headers.set("x-real-ip", ip);
  }
  headers.set("x-forwarded-host", req.nextUrl.host);
  headers.set("x-forwarded-proto", req.nextUrl.protocol.replace(":", ""));

  const metode = req.method;
  const adaBody = metode !== "GET" && metode !== "HEAD";

  try {
    const balasan = await fetch(tujuan, {
      method: metode,
      headers,
      body: adaBody ? await req.arrayBuffer() : undefined,
      // Pengalihan diteruskan ke klien, bukan diikuti di sini, supaya
      // header Location tetap terlihat browser.
      redirect: "manual",
      cache: "no-store",
    });

    const keluar = new Headers();
    balasan.headers.forEach((nilai, nama) => {
      if (!LEWATI_BALASAN.has(nama.toLowerCase())) keluar.append(nama, nilai);
    });

    return new NextResponse(balasan.body, {
      status: balasan.status,
      statusText: balasan.statusText,
      headers: keluar,
    });
  } catch (e) {
    // Alamat backend ikut dicetak: tanpa itu, galat koneksi hanya berkata
    // ECONNREFUSED tanpa menyebut alamat mana yang gagal dijangkau.
    const sebab = e instanceof Error ? e.message : String(e);
    console.error(`Proxy gagal ke ${tujuan}: ${sebab}`);
    return NextResponse.json(
      { error: "Backend tidak bisa dihubungi.", target: tujuan },
      { status: 502 },
    );
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return teruskan(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return teruskan(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return teruskan(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return teruskan(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return teruskan(req, (await ctx.params).path);
}
export async function HEAD(req: NextRequest, ctx: Ctx) {
  return teruskan(req, (await ctx.params).path);
}
export async function OPTIONS(req: NextRequest, ctx: Ctx) {
  return teruskan(req, (await ctx.params).path);
}
