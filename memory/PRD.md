# mAgri MVP — PRD

## What we built
A Magri-like platform (magri.africa) for Botswana smallholder farmers covering all 4 scope-of-work areas from the brief.

## Key features
- **AI Crop & Livestock Diagnose** — Claude Sonnet 4.5 vision via Emergent LLM key. Image + text input, per-call token usage tracked and billed at real rates (BWP 0.10 / 1K input, BWP 0.50 / 1K output). Atomic wallet debit, retry-on-failure, session chat history.
- **Orange Money Top-up (MOCKED)** — Realistic pending → success/failed flow with 10% simulated failure rate, retry endpoint, admin reconciliation for stuck pendings.
- **Internal Analytics** — Admin dashboard with KPIs (users, AI calls, revenue, completions, failed top-ups), daily signups chart, AI usage chart, revenue chart, top users, recent AI logs. GA4 tag injected.
- **Content rendering** — react-markdown + remark-gfm renders headings, tables (GFM), internal + external links correctly on blog detail route with SSR.
- **SEO** — dynamic `/sitemap.xml` (includes blog slugs from DB), `/robots.txt`, per-page canonical tags, JSON-LD (Organization + WebSite in layout, BlogPosting on blog detail), semantic H1/H2.
- **Auth** — email/password signup/login, httpOnly session cookie, BWP 50 free starting credit, admin role (admin@magri.africa / admin123).

## Tech stack
- Next.js 14 App Router + MongoDB + shadcn/ui + Tailwind + recharts
- Python 3.11 helper script (`/app/lib/llm_helper.py`) invoked via `child_process.spawn` from Next.js for Claude calls via `emergentintegrations`
- Credentials: `EMERGENT_LLM_KEY` in `/app/.env`

## Known MOCKED parts
- **Orange Money API is fully mocked** (no real charges). Real Orange Developer credentials needed to go live.
- GA4 uses placeholder `G-XXXXXXXXXX`.

## Demo credentials
- Admin: `admin@magri.africa` / `admin123`
- Any new signup gets BWP 50 free to test the AI diagnose.
