"use client";

import * as React from "react";
import { Ticket } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";

const PAGE_SIZE = 25;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

type CouponRow = {
  code: string;
  source: string;
  prize: string | null;
  won_at: string | null;
  created_at: string;
  profile_id: string;
  voter_name: string | null;
  voter_email: string | null;
  voter_phone: string | null;
};

type CouponCounts = { total: number; pending: number; won: number };

/**
 * Daftar kupon undian: siapa pemiliknya dan sudah diundi atau belum.
 * Halaman ini hanya melihat, aksi undian tetap di halaman Undian.
 */
export default function AdminCouponsPage() {
  const [tab, setTab] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  // Pencarian dikirim ke server (hasil dibatasi 500 baris di backend), ditunda
  // sesaat agar tidak menembak request tiap ketikan.
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-coupons", tab, debouncedSearch],
    queryFn: () =>
      api<CouponRow[]>(
        "/api/admin/raffle/coupons?status=" +
          (tab === "all" ? "" : tab) +
          (debouncedSearch
            ? `&search=${encodeURIComponent(debouncedSearch)}`
            : ""),
      ),
    placeholderData: (prev) => prev,
  });
  const { data: counts } = useQuery({
    queryKey: ["admin-coupons-counts"],
    queryFn: () => api<CouponCounts>("/api/admin/raffle/coupons/counts"),
  });

  React.useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch]);

  const rows = data ?? [];
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Ticket className="h-6 w-6 text-primary" />
          Daftar Kupon
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Semua kupon undian yang sudah terbit, pemiliknya, dan status
          undiannya. Cari lewat kode kupon, nama, email, atau nomor HP.
        </p>
      </div>

      {counts && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Kupon</p>
              <p className="text-2xl font-bold tabular-nums">
                {formatNumber(counts.total)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Belum Diundi</p>
              <p className="text-2xl font-bold tabular-nums">
                {formatNumber(counts.pending)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Sudah Menang</p>
              <p className="text-2xl font-bold tabular-nums text-primary">
                {formatNumber(counts.won)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">
              Semua{" "}
              {counts ? <Badge variant="secondary">{counts.total}</Badge> : null}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Belum Diundi{" "}
              {counts ? (
                <Badge variant="warning">{counts.pending}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="won">
              Sudah Menang{" "}
              {counts ? <Badge variant="success">{counts.won}</Badge> : null}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Cari kode kupon / voter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={
            debouncedSearch
              ? "Kupon tidak ditemukan"
              : tab === "won"
                ? "Belum ada kupon yang menang"
                : "Belum ada kupon"
          }
          description={
            debouncedSearch
              ? "Coba kata kunci lain."
              : "Kupon terbit setelah klaim voter disetujui."
          }
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode Kupon</TableHead>
                    <TableHead>Pemilik</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Terbit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((c) => (
                    <TableRow key={c.code}>
                      <TableCell className="font-mono font-medium">
                        {c.code}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {c.voter_name ?? "Tanpa nama"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.voter_email ?? "-"}
                          {c.voter_phone ? ` · ${c.voter_phone}` : ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        {c.won_at ? (
                          <div className="space-y-0.5">
                            <Badge variant="success">Sudah Menang</Badge>
                            <p className="text-xs text-muted-foreground">
                              {c.prize ?? "Hadiah"} ·{" "}
                              {formatDateTime(c.won_at)}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="warning">Belum Diundi</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(c.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {rows.length > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-muted-foreground">
                Hal {safePage} / {pageCount} · {rows.length} kupon
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= pageCount}
                onClick={() => setPage(safePage + 1)}
              >
                Berikutnya
              </Button>
            </div>
          )}
          {rows.length >= 500 && (
            <p className="text-center text-xs text-muted-foreground">
              Menampilkan 500 kupon terbaru. Pakai kotak cari untuk menemukan
              kupon tertentu.
            </p>
          )}
        </>
      )}
    </div>
  );
}
