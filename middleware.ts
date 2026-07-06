import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE = "idola_token";
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-me",
);

// Halaman yang boleh diakses tanpa onboarding selesai.
const ONBOARDING_ALLOW = ["/onboarding", "/login", "/akun"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const redirectTo = (pathname: string, withNext = false) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    if (withNext) url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  };

  const token = request.cookies.get(AUTH_COOKIE)?.value;

  // --- Gate admin: harus login + role admin ---
  if (path.startsWith("/admin")) {
    if (!token) return redirectTo("/login", true);
    try {
      const { payload } = await jwtVerify(token, SECRET);
      if (payload.role !== "admin") {
        return redirectTo(payload.role === "admin" ? "/admin" : "/");
      }
    } catch {
      return redirectTo("/login", true);
    }
    return NextResponse.next();
  }

  // --- Gate onboarding: voter login tapi belum wizard → paksa /onboarding ---
  // Berlaku untuk semua halaman voting kecuali daftar allow.
  if (token && !ONBOARDING_ALLOW.some((p) => path.startsWith(p))) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      if (payload.role === "voter" && payload.onboarded === false) {
        return redirectTo("/onboarding");
      }
    } catch {
      // token invalid → biarkan lewat (halaman publik tetap bisa dilihat).
    }
  }

  return NextResponse.next();
}

export const config = {
  // Semua route kecuali api, asset next, file statis.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|logo.png).*)"],
};
