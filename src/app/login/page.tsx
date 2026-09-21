"use client";

import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleButton } from "./google-button";
import { useTranslation } from "@/lib/i18n";
import { REGISTER_URL } from "@/lib/event-links";

export default function LoginChooserPage() {
  const t = useTranslation("login");
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/10 to-background p-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto flex items-center gap-2 font-bold">
            <GraduationCap className="h-7 w-7 text-primary" />
            Youth Character Summit
          </Link>
          <CardTitle className="pt-2 text-lg">{t.chooseAs}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Suspense fallback={null}>
            <GoogleButton />
          </Suspense>

          {/* Pemisah: dua pilihan ini beda tujuan, voter masuk ke aplikasi,
              peserta keluar ke situs event. */}
          <div className="flex items-center gap-3 pt-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {t.or}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <a
            href={REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t.registerAsParticipant}
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
          <p className="text-center text-xs text-muted-foreground">
            {t.registerHint}
          </p>

          <p className="pt-2 text-center text-xs text-muted-foreground">
            {t.hint}{" "}
            <Link href="/" className="text-primary hover:underline">
              {t.homePage}
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
