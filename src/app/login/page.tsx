import Link from "next/link";
import { Suspense } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleButton } from "./google-button";

export default function LoginChooserPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/10 to-background p-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto flex items-center gap-2 font-bold">
            <GraduationCap className="h-7 w-7 text-primary" />
            Youth Character Summit
          </Link>
          <CardTitle className="pt-2 text-lg">Masuk sebagai</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Suspense fallback={null}>
            <GoogleButton />
          </Suspense>
          <p className="pt-2 text-center text-xs text-muted-foreground">
            Voter masuk pakai akun Google, lengkapi profil sekali, lalu
            langsung bisa vote di{" "}
            <Link href="/" className="text-primary hover:underline">
              halaman utama
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
