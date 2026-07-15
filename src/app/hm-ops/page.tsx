import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata: Metadata = {
  title: "Command Center",
  robots: { index: false, follow: false },
};

/** Secret admin — not linked in nav. Set ADMIN_PASSWORD in Vercel. */
export default function AdminPage() {
  return (
    <div className="min-h-[50vh]">
      <AdminDashboard />
    </div>
  );
}
