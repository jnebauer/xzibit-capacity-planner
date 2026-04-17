# Phase 1 Capacity Planner Upgrade Decision Log

## Objective

Upgrade the standalone `capacity-planner-prod2` application so its planning logic aligns with the Whiplash capacity planner for the Phase 1 scope: curve-based workshop demand, improved staff capacity logic, company closures, contractor handling, new planning endpoints, and dashboard integration.

## Key Implementation Decisions

| Area | Decision | Reason |
|---|---|---|
| **Demand engine** | Replaced the dashboard's flat client-side allocation with a server-side curve-driven engine in `lib/rulesEngine.ts` and `app/api/demand/calculate/route.ts`. | The handover identified flat distribution as the main planning defect. |
| **Curve source** | Added fallback loading from the exported Whiplash JSON files in `data/whiplash/` when the new database tables are not yet populated. | This lets the app begin using Whiplash logic immediately while keeping curve selection review open. |
| **Capacity engine** | Implemented weekly capacity in `lib/capacityEngine.ts` using `dailyHours × utilisation × availableDays`, with employees excluded by leave/closures and contractors counted only when explicitly marked available. | This matches the clarified business rules supplied in chat. |
| **Schema migration** | Created `phase1_capacity_planner_schema.sql` to add `cp_curves`, `cp_curve_registry`, `cp_company_closures`, `employee_type`, and date-range availability fields. | The standalone schema did not support the Whiplash planning model yet. |
| **Backward compatibility** | Kept the legacy staff API shape working while extending it with `employeeType`, `startDate`, `endDate`, and `absenceType`. | This reduces the risk of breaking existing employee pages while Phase 1 is introduced. |
| **Dashboard integration** | Kept the standalone dashboard UI but changed its data source to the new planning endpoints. | The handover recommended keeping the standalone UI and replacing only the logic. |
| **Validation strategy** | Added unit tests with Vitest and also ran a production build and TypeScript validation. | This satisfies the requirement for internal QA before reporting progress. |

## Validation Performed

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | Passed after fixing the repository's remaining Next.js 15 dynamic route signatures |
| `pnpm exec next build` | Passed |
| `pnpm exec vitest run` | Passed, 2 tests |
| `node --check scripts/seed-phase1-data.mjs` | Passed |

## Remaining Gaps

| Gap | Impact | Recommended Next Step |
|---|---|---|
| **Database migration not yet applied** | The app currently relies on fallback curve JSON and cannot persist new curve registry / closure data until the schema is applied. | Apply `phase1_capacity_planner_schema.sql` to the testing Supabase project. |
| **Testing-environment credentials are not exposed in this sandbox** | I cannot directly execute the schema or seed data against Supabase from this session because no Supabase connection variables are available locally. | Provide the testing environment variables here or run the prepared seed command in the target environment after applying the SQL migration. |
| **Curve review workflow not yet implemented** | You still need to choose which Whiplash curves should become the live defaults. | Build the next UI/API slice for curve review and registry editing. |
| **Seed/import workflow is prepared but not yet executed against Supabase** | Curves, registry rows, staff, availability, and derived company closures can now be loaded in one step, but only after credentials are present. | Run `pnpm run seed-phase1-data` in an environment with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. |
| **Company closures maintenance UI not yet added** | Closures can be used only once rows exist in the database. | Add a simple CRUD surface or import step for closure dates. |
| **Dashboard still fetches project completeness from legacy project fields** | This is acceptable for Phase 1, but project-entry flows still reflect the older model. | Align project editing and validation rules in a later phase. |

## Files Introduced or Updated

### New files

- `lib/capacityPlanning.ts`
- `lib/rulesEngine.ts`
- `lib/capacityEngine.ts`
- `app/api/demand/calculate/route.ts`
- `app/api/capacity/weekly/route.ts`
- `phase1_capacity_planner_schema.sql`
- `vitest.config.ts`
- `tests/phase1-engines.test.ts`
- `scripts/seed-phase1-data.mjs`
- `data/whiplash/curves-data.json`
- `data/whiplash/curve-registry-data.json`
- `data/whiplash/staff-data.json`
- `data/whiplash/staff-availability-data.json`
- `data/whiplash/capacity-planner-projects.json`

### Updated files

- `app/dashboard/page.tsx`
- `app/api/staff/route.ts`
- `app/api/staff/[id]/route.ts`
- `app/api/staff/[id]/leave/route.ts`
- `lib/supabase.ts`
- `package.json`
- `pnpm-lock.yaml`
- `app/api/job-types/[id]/route.ts`
- `app/api/projects/[id]/route.ts`
- `app/api/rows/[sheet]/route.ts`
- `app/api/staff/[id]/route.ts`
- `app/api/staff/[id]/leave/route.ts`
- `app/api/staff/[id]/leave/[date]/route.ts`

## Recommended Immediate Next Action

Apply the schema migration to the testing Supabase environment, then run `pnpm run seed-phase1-data` in that environment so the fallback JSON can be replaced by live database-backed defaults for curves, registry rows, staff availability, and company closures.
