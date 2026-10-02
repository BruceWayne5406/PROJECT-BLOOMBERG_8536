# AGENTS.md — Semiconductor Supplier–Buyer Commitment Platform

This file is persistent project context for any AI agent working in this repo. Read it before making changes. It is not a one-time build prompt — it's the standing reference for domain rules, data model, and conventions that every future change must respect.

## What this platform is

A collaboration + audit layer for semiconductor demand/supply commitments, sitting between ERP, CLM, PLM, and APS systems. It is the system of record for **forecasts, supplier commits, POs/acks, and change orders** — nothing more. It is never the system of record for contracts (CLM owns those), specs/BOMs (PLM owns those), or invoices/receipts (ERP owns those).

## Non-negotiable domain rules

Any code touching commit/forecast/PO logic must respect these. If a change would violate one, stop and flag it rather than silently working around it.

1. **Never overwrite a version.** ForecastLine and ForecastCommit are append-only. Every republish/re-commit increments `version` and retains the prior row.
2. **Partial/split commits are first-class**, not an edge case. A single ForecastLine can have many ForecastCommit rows. Never model a commit as a single scalar accept/reject.
3. **Forecasts are non-binding; POs/schedule lines are binding.** Never let UI or logic imply a forecast or planning-grade commit is a guaranteed delivery.
4. **Silence is not acceptance.** No response after the configured SLA raises an exception automatically — it never defaults to "accepted."
5. **Derived fields are computed, never hand-edited**: `gap_qty`, `late_flag`, `commit_age`, `version_delta`, `otif`. If a field is in §4.5 of the design brief, it has no manual edit path.
6. **Every write needs `actor_id` + `timestamp`**, and every post-firm-fence change needs a `reason_code`. This is a functional requirement, not just logging.
7. **OTIF/lateness is measured against the last accepted promise date, never the original headline request.**
8. **`demand_type` separates base from upside demand** — upside must never silently consume capacity committed to base without an explicit allocation decision.
9. **Time fences and flexibility bands live in TradingPartnerSetup data, never hardcoded.** Week-counts, % bands, UoM, and date convention (dock vs ship vs wafer-start) are per-partner config.
10. **This platform doesn't own documents it only references** — contracts, specs/BOM revisions, CoC/CoA. Store IDs/links, not the source-of-truth content.

## Data model (source of truth for schema — see design brief §4/§5 for full field list)

- `TradingPartnerSetup` — channel (EDI/portal/Excel), UoM, need_by_convention, time fences, flexibility bands
- `ForecastLine` — buyer's demand signal; versioned; `status`: draft | published | superseded
- `ForecastCommit` — supplier's response to a ForecastLine; many-per-line; `commit_grade`: planning | firming | frozen; `status`: offered | accepted | rejected | superseded
- `PurchaseOrder` / `POAcknowledgement` — binding schedule lines, created from accepted commits, never re-keyed
- `ChangeOrder` — any post-firm-fence amendment; requires `reason_code`
- Derived: `gap_qty`, `late_flag`, `commit_age`, `version_delta`, `otif`

Identity/master fields required on every entity where applicable: `buyer_id`/`supplier_id` (DUNS or internal ID, never a person's name), `part_number` + `mpn`, `revision`/`mask_set`/`por_id`, `uom`, `need_by_convention`, `site`/`ship_to`/`ship_from`, `incoterms`, `currency`.

## Tech stack

- **Frontend:** Next.js (App Router) + TypeScript, TanStack Table (split-row grids, version diffs), TanStack Query (fetching/polling)
- **Backend:** NestJS, modules mirroring entities (Forecast, Commit, PO, ChangeOrder, TradingPartnerSetup)
- **DB:** PostgreSQL — append-only event log + materialized current-state views, not overwritten rows
- **Async/workflow:** Redis + BullMQ — SLA-breach detection, ERP write-back retries, notifications
- **Excel import:** `exceljs` + Zod schema validation — reject malformed rows, never guess-fill
- **EDI (later phase):** 850/855/860 translation layer feeding the same ingestion pipeline as other channels — no special-casing once parsed
- **Auth/audit:** every mutation captures `actor_id` + `timestamp` (+ `reason_code` where applicable)

## Visual system

- **Fonts:** Inter (UI/body, `tabular-nums` enabled everywhere qty/date values appear), IBM Plex Mono or JetBrains Mono (IDs, part numbers, version strings)
- **Status color = semantic, mapped directly to `commit_grade`/`status`:**
  - Planning-grade: `#8B94A3` (muted gray-blue)
  - Firming: `#D9A441` (amber)
  - Frozen/accepted/firm: `#1E9E6B` (green) — reserved strictly for true binding commitments
  - Late/gap/exception: `#E0524B` (red)
  - Superseded/de-commit/rejected: low-opacity gray, optional strikethrough
  - Primary brand accent (sparing use, primary actions only): `#2D6CDF`
  - Base neutrals: `#0F1419` dark / `#F7F8FA` light

## System boundaries — do not build these

- Contract lifecycle management (redlines, e-signature, clause library) → belongs in CLM
- Spec/BOM/PLM revision management → belongs in PLM
- Constrained planning / ATP-CTP computation → belongs in APS; this platform *consumes* the ATP signal, never recomputes it
- Invoicing, receipt, financial settlement → belongs in ERP
- Lot genealogy / WIP tracking → belongs in MES/foundry portal

If a feature request pushes into any of the above, flag it as scope creep before implementing.

## Acceptance bar for any commit-related feature

A user must be able to answer these from the UI alone, no email/spreadsheet needed:
1. What was requested, in which version, on what date?
2. What did the supplier commit, in how many splits, at what grade?
3. What's still uncommitted, and why (`reason_code`)?
4. Which slices are now POs, with what acknowledged date?
5. What actually shipped against those promises?

## Build sequence (current phase should be tracked in project board, not here)

Schema/migrations → ForecastLine versioning → ForecastCommit + derived fields → exception engine → PO/Ack + conversion flow → ChangeOrder flow → Excel import channel → ERP/IBP write-back hooks → exception dashboard → EDI channel (later phase).

Reference: full worked example and field-level spec are in the project's Semiconductor Commitment Process Design Brief — treat that document as the authoritative domain spec if this file and the brief ever appear to conflict.