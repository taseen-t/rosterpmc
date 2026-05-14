import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { AdminLoginForm } from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="mx-auto max-w-md px-6 md:px-8 py-24 md:py-32">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(26,26,26,0.04)] p-10 md:p-12">
        <div className="text-center mb-10">
          <p className="eyebrow-accent">Admin</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--foreground)] tracking-tight">
            Roster control panel
          </h1>
          <p className="mt-3 text-sm text-[var(--muted-foreground)] leading-relaxed">
            Sign in with the admin password to manage students, capacities, and
            rotations.
          </p>
        </div>
        <div className="hairline mb-8" />
        <AdminLoginForm />
      </div>
    </div>
  );
}
