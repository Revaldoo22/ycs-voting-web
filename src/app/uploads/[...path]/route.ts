import { type NextRequest, NextResponse } from "next/server";

/**
 * Teruskan /uploads/* ke backend.
 *
 * Alasannya sama dengan proxy /api: rewrites di next.config dievaluasi saat
 * build, jadi alamat backend ikut terkunci ke dalam image Docker. Foto
 * peserta yang dilayani backend tidak akan tampil kalau alamatnya salah.
 */
export const dynamic = "force-dynamic";

function backend(): string {
  const v = process.env.API_PROXY_URL;
  return (v && v.trim() !== "" ? v : "http://localhost:4000").replace(
    /\/+$/,
    "",
  );
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const tujuan = `${backend()}/uploads/${path.join("/")}${req.nextUrl.search}`;

  try {
    const balasan = await fetch(tujuan, { cache: "no-store" });
    const keluar = new Headers();
    for (const nama of ["content-type", "cache-control", "etag", "last-modified"]) {
      const nilai = balasan.headers.get(nama);
      if (nilai) keluar.set(nama, nilai);
    }
    return new NextResponse(balasan.body, {
      status: balasan.status,
      headers: keluar,
    });
  } catch (e) {
    const sebab = e instanceof Error ? e.message : String(e);
    console.error(`Proxy uploads gagal ke ${tujuan}: ${sebab}`);
    return new NextResponse(null, { status: 502 });
  }
}
