# House Job Selection Portal — Allied Hospital, Faisalabad

Online seat-selection portal for FMU House Officers (2026-27 batch).

- Public live roster + seat matrix on `/`
- Roll-number login (`/login`)
- 4-rotation seat picker (`/select`) — atomic submit, locked thereafter
- Admin panel (`/admin`) — fix OCR'd student data, adjust capacities, reset users

## Stack

- Next.js 16 (App Router, Turbopack, React 19.2, React Compiler)
- Tailwind CSS 4
- Postgres (Vercel Postgres / Neon) via the `postgres` npm package
- Static student & department data baked into `data/*.json`

## Local development

1. Install deps:
   ```bash
   npm install
   ```
2. Get a free Postgres database — e.g. [Neon](https://neon.tech) or [Vercel Postgres](https://vercel.com/storage/postgres). Copy the connection string.
3. Create `.env.local`:
   ```env
   DATABASE_URL="postgres://…"
   SESSION_SECRET="any-long-random-string"
   ADMIN_PASSWORD="set-a-strong-password"
   ```
4. Run:
   ```bash
   npm run dev
   ```
   The schema auto-creates on first request.
5. Visit http://localhost:3000

Default admin password (dev only) is `admin1234`.

## Deploying to Vercel

1. Push to GitHub, then import the repo in Vercel.
2. Add a Postgres database in **Storage → Create → Postgres**. Vercel injects `DATABASE_URL` automatically.
3. In **Settings → Environment Variables**, add:
   - `SESSION_SECRET` — any 32+ char random string
   - `ADMIN_PASSWORD` — your admin password
4. Deploy. The schema auto-creates on first request.

## Data

- `data/students.json` — OCR-extracted from *Result MBBS Final Prof. Annual 2025*. Edit per-row in the admin panel; corrections persist in `student_overrides`.
- `data/departments.json` — OCR-extracted from *PMC Regular HO 25*. Capacities are per rotation; adjust in the admin panel via `dept_overrides`.

## Selection rules

- Roll number must be in this year's roster and marked **Pass**.
- Each user picks **4 distinct departments**, one per rotation, **all at once**.
- Seats are first-come-first-served; full seats are disabled in the picker.
- Submission is **final** — only an admin can reset a user.

## Admin powers

- Edit any student's name / total marks / pass-fail / rank
- Hide a student (e.g. wrong batch)
- Adjust seat capacity per department
- Reset a user's submission (clears their 4 picks; they can re-submit)
