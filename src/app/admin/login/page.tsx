import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { AdminLoginForm } from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="mx-auto max-w-md px-4 md:px-6 py-12 md:py-16">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-navy-700/10 grid place-items-center ring-1 ring-navy-700/20">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-navy-800"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Admin login</h1>
            <p className="text-sm text-slate-500">Roster control panel</p>
          </div>
        </div>
        <AdminLoginForm />
        <p className="mt-6 text-xs text-slate-500">
          Set the admin password via the <code>ADMIN_PASSWORD</code> environment variable
          on Vercel. Default in dev is <code>admin1234</code>.
        </p>
      </div>
    </div>
  );
}
