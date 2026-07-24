"use client";

import * as React from "react";
import { Gift, GraduationCap, Smartphone, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PrizeButtons() {
  return (
    <div className="flex justify-center">
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="accent" className="rounded-full">
            <Gift className="h-4 w-4" />
            Reward
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reward YCS</DialogTitle>
            <DialogDescription>
              Pilih perjalananmu di Youth Character Summit.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Jadi Peserta */}
            <a
              href="https://events.stekom.ac.id/ycs2026"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 transition-colors hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="h-6 w-6" />
              </span>
              <p className="font-bold">Jadi Peserta</p>
              <p className="text-sm text-muted-foreground">
                Berkesempatan mengikuti acara <b>Youth Character Summit</b> dan
                tampil sebagai peserta unggulan.
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Daftar sekarang
              </div>
            </a>

            {/* Jadi Voter */}
            <div className="flex flex-col gap-2 rounded-2xl border border-accent/30 bg-accent/[0.05] p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Users className="h-6 w-6" />
              </span>
              <p className="font-bold">Jadi Voter</p>
              <p className="text-sm text-muted-foreground">
                Beri dukungan sesuai syarat yang berlaku, dapatkan kupon undian,
                dan berkesempatan memenangkan <b>Handphone</b>.
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-accent">
                <Smartphone className="h-3.5 w-3.5" />
                Undian Handphone
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
