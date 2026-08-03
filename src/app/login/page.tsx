"use client";

import Link from "next/link";
import { Suspense } from "react";
import { GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleButton } from "./google-button";
import { useTranslation } from "@/lib/i18n";

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
