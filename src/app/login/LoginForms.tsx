"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { studentSignIn, studentSignUp } from "@/app/actions";
import { formatCnic } from "@/lib/cnic";

type Mode = "signin" | "signup";

export function LoginForms() {
  const [mode, setMode] = useState<Mode>("signin");

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 mb-5">
        <ModeTab active={mode === "signin"} onClick={() => setMode("signin")}>
          Sign in
        </ModeTab>
        <ModeTab active={mode === "signup"} onClick={() => setMode("signup")}>
          First time? Register
        </ModeTab>
      </div>

      {mode === "signin" ? <SignInForm /> : <SignUpForm />}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function SignInForm() {
  const [cnic, setCnic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const cnicDigits = cnic.replace(/\D/g, "").length;
  const ready = cnicDigits === 13;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await studentSignIn({ cnic });
          if (r?.error) setError(r.error);
          else router.refresh();
        });
      }}
      className="space-y-4"
    >
      <Field label="CNIC" hint={`${cnicDigits}/13 digits`}>
        <input
          name="cnic"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          required
          maxLength={15}
          value={cnic}
          onChange={(e) => setCnic(formatCnic(e.target.value))}
          placeholder="00000-0000000-0"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 font-mono tabular-nums focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
        />
      </Field>

      {error && <ErrorRow>{error}</ErrorRow>}

      <button
        type="submit"
        disabled={pending || !ready}
        className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-[11px] text-slate-400">
        Just your CNIC — that's all we need on every visit after the first one.
      </p>
    </form>
  );
}

function SignUpForm() {
  const [name, setName] = useState("");
  const [cnic, setCnic] = useState("");
  const [roll, setRoll] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const cnicDigits = cnic.replace(/\D/g, "").length;
  const ready =
    name.trim().length >= 2 &&
    cnicDigits === 13 &&
    /^\d{4,8}$/.test(roll.trim());

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await studentSignUp({ name, cnic, roll });
          if (r?.error) setError(r.error);
          else router.refresh();
        });
      }}
      className="space-y-4"
    >
      <Field
        label="Your name"
        hint="As you'd like it to appear on the roster"
      >
        <input
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Hina Anwar"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
        />
      </Field>

      <Field label="CNIC" hint={`${cnicDigits}/13 digits`}>
        <input
          name="cnic"
          inputMode="numeric"
          autoComplete="off"
          required
          maxLength={15}
          value={cnic}
          onChange={(e) => setCnic(formatCnic(e.target.value))}
          placeholder="00000-0000000-0"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 font-mono tabular-nums focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
        />
      </Field>

      <Field label="Roll number">
        <input
          name="roll"
          inputMode="numeric"
          autoComplete="off"
          required
          maxLength={8}
          value={roll}
          onChange={(e) => setRoll(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="000000"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 font-mono tabular-nums focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
        />
      </Field>

      {error && <ErrorRow>{error}</ErrorRow>}

      <button
        type="submit"
        disabled={pending || !ready}
        className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5"
      >
        {pending ? "Registering…" : "Register & continue"}
      </button>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        This binds your CNIC to your roll number permanently. Next time you
        visit, just type your CNIC to sign in.
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function ErrorRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-rose-50 ring-1 ring-rose-100 px-3 py-2 text-sm text-rose-700">
      {children}
    </div>
  );
}
