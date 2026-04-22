# Copilot instructions for universum-observatory

## Code Style Guide
- Prefer clean legible code over meeting all features or performance
  - variables should be descriptive
  - there should be comments explaining why files and functions exist (not their inputs / outputs but how they are used)
  - code should be concise and not overly verbose wherever possible
  - the architecture and layout of files should be easy to review and read as a human
  - everything should be framed from a user-centric behavior driven development focus
  - if an initial solution doesn't work and requires much more complexity, first review if that is truly required, and then consult the developer before proceeding
  - it is better to have a simple and easy to understand codebase than complete every feature

- Requirements should be tracked within feature files in the docs folder
  - All changes to requirements should be updated in that folder
  - The files should be human readable, and user focused, and contain very simple high level descriptions of expected behavior
  - Follow behavior driven development standards
  - Requirement files should contain checkboxes to track what is implemented / to do / has regressions
  - Requirements are the source of truth for the entire project, and should be easy to read and contain sufficient detail to recreate the project from those alone
  - Requirements should automatically be added to based on developer requests to change code

- File architecture
  - Keep file design simple. 
  - Use multiple files and modules as makes sense for clean architecture, but avoid over optimization. 
  - Keep any static / sample data in isolated file(s) for easy modification.
  - Static / sample data should be in a very human readable and editable format, so it can be tweaked and updateed easily by developers.
  - Data fetching should be designed with third party databases in mind so it is easy to switch to those when needed. Don't overplan for this, but keep the design simple and adaptable.

## Change Tracking
- Architectural decisions should be documented within a `docs/adrs` folder
  - automatically update this based on user inputs and requests
- High level changes should be tracked on a release notes file for the current software version
  - software version will be incremented manually by the developer
  - implement an initial version and file if one doesn't exist
  - automatically add to this as you make code changes

## UI Styling
- The UI should be clean and minimal wherever possible
  - Do not add extra cards / fonts / visual clutter unless it is necessary
  - Text should be compact when dealing with dense data to allow users to scan through data quicker
  - Layouts should prioritize clean feeling and rapid legibility
  - Do not use extra spacing for legibility, it can make things harder to read.

## Architecture at a glance
- This is a Next.js App Router project (`next@16`, `react@19`) with route groups to control layout behavior:
  - `(breadcrumb)` pages (e.g. `app/(breadcrumb)/search/page.tsx`) render under a breadcrumb shell.
  - `(no_breadcrumb)` pages (e.g. `app/(no_breadcrumb)/globe/page.tsx`) skip that shell.
- The app is organized by feature area, with the main user-facing surfaces currently centered on search, globe, policy brief generation, admin reference-data management, and admin auth.
- Pages should stay focused on rendering and interaction state, browser fetch logic should stay in feature-local service files, and server orchestration should stay in feature API/service/repository modules.
- Public reading stays open by default, while admin writes are protected through Auth.js session checks and shared permission helpers.
- Data is persisted through Prisma against PostgreSQL, with feature APIs under `app/api/*` and shared database setup in `lib/prisma.ts`.
- Current architecture direction is server-first bootstrap for initial page data, then client-side SWR refreshes for interactive updates.

## High-level app architecture
- `app/(breadcrumb)/*` and `app/(no_breadcrumb)/*` contain the main route surfaces and should remain the primary place users read and author content.
- `app/api/<feature>/*` owns each feature's HTTP contract, request validation, and delegation into feature services or repositories.
- Feature service/repository modules are the main server boundary for query composition, mutation orchestration, and Prisma access.
- `lib/auth/*`, `lib/permissions/*`, and `lib/validation/*` hold cross-cutting auth, access-control, and validation rules that should not be reimplemented ad hoc in feature files.
- `docs/features/*` are the behavior source of truth, `docs/design/*` captures architecture guidance, and `docs/adrs/*` records architectural decisions.

## Data flow and service boundaries
- Client page uses SWR for both list and detail queries (`useSWR(searchKey, fetchUseCases)` and `useSWR(selectedCard, fetchUseCaseDetails)`).
- Network calls are centralized in `app/(breadcrumb)/search/service.ts`; keep fetch logic out of JSX components.
- URL query params are the state contract for filters, managed via `hooks/use-search-param-state.ts`.
- Query serialization pattern uses CSV strings (`lib/utils.ts`: `parseCsv`, `toCsv`) instead of repeated params.
- API filter parser accepts alias keys for compatibility:
  - time horizon: `time` and `timeHorizon`
  - evidence status: `evidence` and `evidenceStatus`

## Project-specific conventions
- Use the `@/*` import alias from `tsconfig.json` (avoid deep relative imports).
- Keep API DTO naming consistent with the existing feature contracts; do not casually rename stable fields without updating all affected layers together.
- Details routes, links, and selected-state behavior should use stable database ids rather than display titles.
- Filter labels map to business logic in both client and API:
  - TRL buckets: `TRL 1-3`, `TRL 4-6`, `TRL 7-9`
  - time horizon buckets: `Now-2027`, `2028-2033`, `2034+`
- Reuse existing composition components (`components/sidebar.tsx`, `components/card-results-list.tsx`, `components/tag-selector.tsx`) before introducing new UI primitives.

## Testing and quality
- Tests should stay human readable, user focused, and behavior driven. Prefer scenarios and names that describe what a user can do or observe, not internal implementation details.
- Keep automated tests aligned with the feature requirements in `docs/features/*`. When behavior changes, update the relevant requirement docs and the affected tests in the same change.
- End-to-end coverage is organized around Playwright BDD feature files under `tests/e2e/features/*`; keep those feature files readable to non-developers and consistent with the documented feature behavior.
- Use the existing quality workflow and scripts rather than inventing one-off test commands when avoidable:
  - `npm run lint`
  - `npm run build`
  - `npm run test:e2e:generate`
  - `npm run test:e2e`
- Prefer focused, maintainable coverage for the changed behavior over broad brittle tests. If a feature changes and an existing test or feature file becomes stale, update it rather than leaving contradictory documentation or scenarios behind.

## Styling and UI stack
- Tailwind CSS v4 + shadcn/radix setup (`components.json`, `app/globals.css`).
- Shared class merging helper is `cn()` in `lib/utils.ts`.
- Global layout uses fixed viewport math (`app/layout.tsx`, `app/(breadcrumb)/layout.tsx`), so new full-page screens should respect existing `h-[calc(...)]` patterns.

## Developer workflows
- Install and run locally:
  - `npm install`
  - `npm run dev`
- Quality checks:
  - `npm run lint`
  - `npm run build`
- Deployment target is Netlify via `@netlify/plugin-nextjs` (`netlify.toml`).

## When extending search
- Update all 3 layers together: URL state (`use-search-param-state` usage), request builder in `search/service.ts`, and API parsing/filtering in `app/api/use-cases/route.ts` + `search.ts`.
- Keep SWR behavior consistent (`revalidateOnFocus: false`, `keepPreviousData: true`) unless there is a clear UX reason to change it.
