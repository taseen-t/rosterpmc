import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { AdminLoginForm } from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="mx-auto max-w-md px-4 md:px-6 py-20 md:py-32">
      <div className="border-2 border-[var(--border)] p-8 md:p-12">
        <p className="eyebrow-accent">Admin</p>
        <h1 className="mt-3 font-display text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-[0.85] text-[var(--foreground)]">
          Sign in.
        </h1>
        <p className="mt-4 text-sm md:text-base text-[var(--muted-foreground)] leading-tight uppercase tracking-wider">
          Enter the admin password to manage students, capacities, and
          rotations.
        </p>
        <div className="hairline mt-8 mb-8" />
        <AdminLoginForm />
      </div>
    </div>
  );
}
