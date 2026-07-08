"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { FilterBar, FilterField } from "@/components/filter-bar";
import { SelectBox } from "@/components/ui/select-box";
import {
  fetchAllAdminVoters,
  useAdminVoters,
  useAdminVotersCount,
  useParticipants,
  useSchools,
  useVoterDistribution,
  type AdminVoter,
} from "@/lib/queries";
import { formatNumber, voterStatusLabel } from "@/lib/utils";
import { dateStamp, exportToExcel } from "@/lib/export-excel";

const PAGE_SIZE = 25;

const STATUS_OPTS = [
  { value: "teman_sekolah", label: "Teman satu sekolah" },
  { value: "guru", label: "Guru" },
  { value: "keluarga", label: "Keluarga" },
  { value: "teman_luar", label: "Teman di luar sekolah" },
  { value: "peserta", label: "Peserta" },
];

export default function AdminVotersPage() {
  const [participantId, setParticipantId] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [schoolFilter, setSchoolFilter] = React.useState("");
  const [sort, setSort] = React.useState<
    "recent" | "points_desc" | "points_asc"
  >("recent");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<AdminVoter | null>(null);

  // Debounce search to avoid a query per keystroke.
  const [debSearch, setDebSearch] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(
    () => setPage(1),
    [debSearch, statusFilter, schoolFilter, participantId, from, to, sort]
  );

  const baseFilters = {
    participantId,
    from,
    to,
    search: debSearch,
    status: statusFilter,
    school: schoolFilter,
  };

  const { data: total } = useAdminVotersCount(baseFilters);
  const { data, isLoading, isError, refetch } = useAdminVoters({
    ...baseFilters,
    sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const { data: participants } = useParticipants();
  const { data: schoolList } = useSchools();

  const schools = (schoolList ?? []).map((s) => s.name);
  const totalCount = total ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const paged = data ?? [];

  const [exporting, setExporting] = React.useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const all = await fetchAllAdminVoters({ ...baseFilters, sort });
      if (all.length === 0) {
        toast.error("Tidak ada data untuk diekspor pada filter ini.");
        return;
      }
      const rows = all.map((v) => ({
        Nama: v.voter_name,
        "Nomor WA": v.voter_phone,
        Email: v.voter_email ?? "",
        Status: voterStatusLabel(v.voter_status) || "",
        Kelas: v.voter_class ?? "",
        Sekolah: v.voter_school ?? "",
        Daerah: v.region ?? "",
        "Niat Kuliah":
          v.college_intent === "ya"
            ? "Ya"
            : v.college_intent === "ragu"
              ? "Ragu"
              : v.college_intent === "tidak"
                ? "Tidak"
                : "",
        Bergabung: v.first_seen
          ? new Date(v.first_seen).toLocaleDateString("id-ID")
          : "",
        Vote: v.votes,
        Quest: v.quests,
        Poin: v.points,
      }));
      exportToExcel(rows, {
        fileName: `voter-${dateStamp()}.xlsx`,
        sheetName: "Voter",
      });
      toast.success(`${formatNumber(rows.length)} voter diekspor.`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Gagal mengekspor data."
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Voter</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Total {formatNumber(totalCount)} voter. Klik baris untuk lihat
            distribusi poin.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting || totalCount === 0}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export Excel
        </Button>
      </div>

      <FilterBar
        showReset={
          !!(participantId || from || to || statusFilter || schoolFilter || search)
        }
        onReset={() => {
          setParticipantId("");
          setFrom("");
          setTo("");
          setStatusFilter("");
          setSchoolFilter("");
          setSearch("");
        }}
      >
        <FilterField label="Cari" span={2}>
          <Input
            placeholder="Nama, nomor, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </FilterField>
        <FilterField label="Peserta">
          <SelectBox
            value={participantId}
            onChange={setParticipantId}
            placeholder="Semua peserta"
            options={[
              { value: "", label: "Semua peserta" },
              ...(participants ?? []).map((p) => ({
                value: p.id,
                label: p.name,
              })),
            ]}
          />
        </FilterField>
        <FilterField label="Status">
          <SelectBox
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Semua status"
            options={[
              { value: "", label: "Semua status" },
              ...STATUS_OPTS.map((s) => ({ value: s.value, label: s.label })),
            ]}
          />
        </FilterField>
        <FilterField label="Sekolah">
          <SelectBox
            value={schoolFilter}
            onChange={setSchoolFilter}
            placeholder="Semua sekolah"
            options={[
              { value: "", label: "Semua sekolah" },
              ...schools.map((s) => ({ value: s, label: s })),
            ]}
          />
        </FilterField>
        <FilterField label="Urutkan">
          <SelectBox
            value={sort}
            onChange={(v) => setSort(v as typeof sort)}
            options={[
              { value: "recent", label: "Terbaru bergabung" },
              { value: "points_desc", label: "Poin tertinggi" },
              { value: "points_asc", label: "Poin terendah" },
            ]}
          />
        </FilterField>
        <FilterField label="Dari tanggal">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </FilterField>
        <FilterField label="Sampai tanggal">
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </FilterField>
      </FilterBar>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : paged.length === 0 ? (
        <EmptyState title="Belum ada voter" />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sekolah</TableHead>
                    <TableHead>Bergabung</TableHead>
                    <TableHead className="text-right">Vote</TableHead>
                    <TableHead className="text-right">Quest</TableHead>
                    <TableHead className="text-right">Poin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((v) => (
                    <TableRow
                      key={v.voter_phone}
                      className="cursor-pointer"
                      onClick={() => setSelected(v)}
                    >
                      <TableCell>
                        <p className="font-medium">{v.voter_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.voter_phone}
                          {v.voter_email ? ` · ${v.voter_email}` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {voterStatusLabel(v.voter_status) || "-"}
                        {v.voter_class ? ` (${v.voter_class})` : ""}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {v.voter_school ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {v.first_seen
                          ? new Date(v.first_seen).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(v.votes)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(v.quests)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatNumber(v.points)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
              >
                Sebelumnya
              </button>
              <span className="text-sm text-muted-foreground">
                Hal {current} / {pageCount}
              </span>
              <button
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                disabled={current >= pageCount}
                onClick={() => setPage(current + 1)}
              >
                Berikutnya
              </button>
            </div>
          )}
        </>
      )}

      <DistributionDialog
        voter={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function DistributionDialog({
  voter,
  onClose,
}: {
  voter: AdminVoter | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useVoterDistribution(voter?.voter_phone);

  return (
    <Dialog open={!!voter} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{voter?.voter_name}</DialogTitle>
          <DialogDescription>
            {voter?.voter_phone}
            {voter?.voter_email ? ` · ${voter.voter_email}` : ""} · Total{" "}
            {formatNumber(voter?.points ?? 0)} poin
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <LoadingState />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Belum ada distribusi poin" />
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Poin diberikan ke:</p>
            <ul className="space-y-1.5">
              {data.map((d) => (
                <li
                  key={d.participant_id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.participant_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.school_name ?? "-"} · {formatNumber(d.votes)} vote ·{" "}
                      {formatNumber(d.quests)} quest
                    </p>
                  </div>
                  <Badge variant="accent" className="shrink-0">
                    {formatNumber(d.points)} poin
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
