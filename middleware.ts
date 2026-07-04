import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ROLE_PREFIX: Record<string, string> = {
  "/admin": "admin",
};

const AUTH_COOKIE = "idola_token";
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-me",
);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const matched = Object.keys(ROLE_PREFIX).find((p) => path.startsWith(p));
  if (!matched) return NextResponse.next();

  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    if (pathname === "/login") url.searchParams.set("next", path);
    else url.search = "";
    return NextResponse.redirect(url);
  };

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return redirectTo("/login");

  let role: string | undefined;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    role = payload.role as string | undefined;
  } catch {
    return redirectTo("/login");
  }

  const required = ROLE_PREFIX[matched];
  if (role !== required) {
    return redirectTo(
      role === "admin" ? "/admin" : "/",
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
