import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { AdminLoginForm } from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="relative overflow-hidden">
      {/* Decorative shapes — pure flat. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-blue-50"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-2xl bg-emerald-50 rotate-12"
      />
      <div className="relative mx-auto max-w-md px-4 md:px-6 py-20 md:py-28">
        <div className="rounded-lg bg-[var(--background)] p-8 md:p-10">
          <p className="eyebrow-primary">Admin</p>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--foreground)] leading-tight">
            Sign in to the control panel
          </h1>
          <p className="mt-3 text-sm md:text-base text-[var(--muted-foreground)] leading-relaxed">
            Enter the admin password to manage students, capacities, and
            rotations.
          </p>
          <div className="my-6 h-px bg-[var(--border)]" />
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
