import { redirect } from "next/navigation";

/** Halaman lama — peringkat sekolah kini jadi tab di /ranking. */
export default function SchoolRankingRedirect() {
  redirect("/ranking?tab=sekolah");
}
