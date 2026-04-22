---
name: jazz-2-app-development
description: 'Implement and review Jazz 2.0 apps with jazz-tools@alpha. Use when working on JazzProvider, createDb, createJazzContext, schema.ts, permissions.ts, migrations, auth modes, useAll, useDb, useSession, durability tiers, branches, Better Auth, file uploads, or local-first sync architecture. Focus on best practices, conventions, app structure, and common pitfalls.'
argument-hint: 'Describe the Jazz feature, schema, auth flow, or architecture change you need help with'
---

# Jazz 2.0 App Development

## When to Use

- Building or refactoring a Jazz 2.0 frontend or TypeScript backend.
- Designing tables, relations, permissions, auth, branches, migrations, or sync flows.
- Reviewing Jazz code for local-first UX issues, permission leaks, or schema drift.
- Adding file uploads, shared access, collaborative lists, or Better Auth integration.

## Task Packs

- For new table and relation design, load [schema design reference](./references/schema-design.md) and start from [schema template](./assets/schema.ts.template).
- For policy audits or new access rules, load [permissions review reference](./references/permissions-review.md) and start from [permissions template](./assets/permissions.ts.template).
- For local-first, external JWT, or Better Auth setup, load [auth setup reference](./references/auth-setup.md) and adapt [auth setup template](./assets/auth-setup.template.tsx).

## Core Mindset

- Treat `schema.ts` as the source of truth for data shape.
- Treat `permissions.ts` as part of the data model, not a later hardening pass.
- Treat local state as authoritative UI state; sync is background propagation.
- Keep queries narrow and stable. Subscriptions define what data is synced.
- Prefer conventions that match Jazz's runtime expectations instead of abstracting them away.

## Default Architecture

- Keep Jazz files close to the app root: `schema.ts`, `permissions.ts`, `migrations/`.
- Export `app = s.defineApp(schema)` once and reuse it everywhere.
- On clients, centralize config in `JazzProvider` or `createJazzClient`.
- On backends, create one `createJazzContext(...)` at startup and derive scoped handles per request.
- Separate client auth wiring from business components. Components should mostly consume `useDb()`, `useAll()`, and `useSession()`.

## Schema And Modeling Conventions

- Model app state as relational tables first. Use refs and separate tables instead of deeply nested JSON when fields need independent reads or writes.
- Use `s.ref("table")` for relations and follow Jazz naming rules exactly: `projectId` or `project_id`; arrays of refs must end in `Ids` or `_ids`.
- Use `$createdBy` when simple creator ownership is enough. Only add explicit owner columns when ownership must transfer or differ from creator authorship.
- Use a dedicated share or membership table for multi-user access instead of packing permissions into JSON.
- Use `s.json()` only for atomic blobs of data that are replaced as a whole. If fields need partial updates, query filters, or permissions, split them into columns or related tables.
- Use the conventional `files`, `file_parts`, and app-owned linking table pattern for large binary data. Reserve `s.bytes()` for small inline binary values.
- Export helper types like `s.RowOf<typeof app.table>`, `s.InsertOf<typeof app.table>`, and `s.WhereOf<typeof app.table>` where they simplify component and service boundaries.

## Permissions Conventions

- Write explicit grants for every table once a compiled policy bundle will be used.
- Default to simple creator or session-scoped policies first, then compose with `anyOf`, `allOf`, `allowedTo.*`, and `exists.where(...)` only when the behavior truly needs it.
- Put row-level security in `permissions.ts`, not in component conditionals or API handlers.
- Use `allowedTo.read/update/delete("relationId")` for parent-child inheritance.
- Use `policy.someTable.exists.where(...)` for share tables or membership lookups.
- For updates, use `whereOld(...)` and `whereNew(...)` when the before/after rules differ.
- Use `session.where({ "claims.role": ... })` for JWT claim-based policies instead of duplicating claim values into table columns.
- Remember that client-side filters improve UX but do not enforce security.

## Auth Guidance

- Pick auth mode deliberately:
  - `anonymous` for read-only or marketing surfaces.
  - `local-first` for instant onboarding, offline-first UX, or try-before-signup flows.
  - `external` for durable user accounts and provider-managed sessions.
- For sign-in, sign-out, or principal changes, recreate `JazzProvider` or `Db`. Do not use `db.updateAuthToken(...)` to switch users or fall back to local-first auth.
- Use `db.updateAuthToken(...)` only to refresh a JWT for the same principal.
- For JWT expiry in React, prefer `onJWTExpired` on `JazzProvider`. Outside React, use `db.onAuthChanged(...)`.
- If you start with local-first auth and later upgrade to external auth, preserve identity by proving ownership of the local-first identity and minting JWTs whose `sub` is the Jazz user id.
- For local-first auth recovery, offer at least one recovery path: passphrase, passkey backup, or linked external auth.
- Keep passkey recovery on a stable `appHostname`, or the passkey namespace changes.

## Query And Read Patterns

- Build queries from reusable immutable query builders rather than mutating one shared object.
- Let live subscriptions drive sync. Only subscribe to data the current screen actually needs.
- Always apply `orderBy(...)` before `limit(...)` and `offset(...)`.
- Prefer narrow `select(...)` projections and targeted `include(...)` trees on large result sets.
- Remember that `include(...)` uses inner-join-like behavior when a referenced row cannot be resolved. Use `requireIncludes()` only when you intentionally want to drop rows with missing forward refs.
- Use `gather(...)` and `hopTo(...)` for recursive traversal instead of client-side recursive fan-out queries.
- In React, treat `useAll(...) === undefined` as "first result not ready yet", not as an empty state.
- Use `useAllSuspense`, `startTransition`, and `useDeferredValue` when filters or pagination would otherwise cause jarring loading resets.

## Write And Mutation Patterns

- Treat writes as local-first by default. The UI should usually update from the local write immediately without a separate optimistic state layer.
- Call `.wait({ tier })` only when the product actually needs a durability guarantee.
- Default durability expectations:
  - `local` for ordinary interactive UI work.
  - `edge` when the app needs confirmation that data left the device or reached the nearest sync server.
  - `global` only for cross-region visibility guarantees or similar hard requirements.
- Use `beginTransaction(...)` when several writes should settle together after validation.
- Use `beginDirectBatch(...)` when several writes should share one batch id but remain immediately visible.
- Use `null` to clear nullable columns. Passing `undefined` to `update(...)` leaves the field unchanged.
- Register a global `db.onMutationError(...)` handler if some writes are not explicitly awaited.

## Backend Patterns

- Create the Jazz context once at startup.
- Use `context.asBackend()` for trusted backend-owned work.
- Use `await context.forRequest(req)` when queries and writes should run as the caller and enforce their permissions.
- Use `context.withAttribution(...)`, `withAttributionForSession(...)`, or `withAttributionForRequest(...)` when backend code should keep backend permissions but stamp authorship as a user.
- Avoid `context.db()` for server-connected code unless you intentionally want an unscoped local handle.

## Branches And Migrations

- Set `env` explicitly, especially in production, to avoid development and production data mixing.
- Use `userBranch` only when you truly need isolated draft or staging data.
- Expect schema hash changes to create new schema branches automatically. Jazz merges schema versions at query time, not separate `env` or `userBranch` values.
- When synced or shared data already exists and `schema.ts` changes, validate locally and then create, review, and push a migration.
- Review generated migration stubs before publishing. Resolve ambiguous rename or drop or add drafts and set meaningful defaults or backwards defaults.
- Permission-only changes do not need migrations, but they still need a deploy.
- `deploy` does not run validation for you. Run `pnpm dlx jazz-tools@alpha validate` first.

## Common App Patterns

- User-owned data:
  - Prefer `$createdBy` plus creator-scoped permissions.
  - Do not add an explicit owner column unless you need transferable ownership.
- Shared access:
  - Use a separate shares table.
  - Gate access with `exists.where(...)` checks.
- Nested hierarchies:
  - Put the FK on the child table.
  - Inherit access with `allowedTo.*("parentId")`.
- Collaborative workspaces:
  - Use explicit membership tables for project or org access.
  - Let child tables inherit from the shared parent.
- Files:
  - Store file metadata and chunk references in the conventional tables.
  - Delete child chunks and file rows before deleting the parent app row until automatic cascade arrives.

## UX And Styling Conventions

- Show locally available data immediately and let remote changes stream in. Avoid blocking the whole screen on network freshness unless the product explicitly needs an authoritative first render.
- Keep loading states small and scoped. In Jazz, a loading state usually means first subscription delivery or an explicitly durable read, not every interaction.
- Avoid duplicating subscribed Jazz state into parallel component state unless you need transient form input or view-local UI state.
- Prefer compact, stable list and detail views that re-render from subscriptions rather than manually refetching after each mutation.
- When filtering or paginating, keep prior results visible while the next query settles instead of flashing to empty.

## Performance And Debugging

- Query breadth matters because active subscriptions determine synced data volume.
- `include()` can become expensive across large outer result sets because each outer row creates its own sub-graph.
- Use the Inspector for schema, permissions, live query, and stored-row debugging. Treat `adminSecret` as infrastructure access, never user-facing config.
- Remember that local browser persistence uses a worker plus OPFS in persistent mode. `driver: { type: "memory" }` skips that path.
- Reads always come from local storage first. Stronger read tiers only gate the first result.

## Implementation Procedure

1. Confirm the Jazz version in `package.json`. If the project is not on Jazz 2.0 or `jazz-tools@alpha`, do not blindly apply this skill.
2. Identify whether the feature is client-only, client plus sync server, or client plus backend service.
3. If the work centers on modeling tables or relations, load [schema design reference](./references/schema-design.md) and adapt [schema template](./assets/schema.ts.template).
4. Model or adjust `schema.ts` first.
5. If the work affects access control, load [permissions review reference](./references/permissions-review.md) and adapt [permissions template](./assets/permissions.ts.template).
6. Write or update `permissions.ts` alongside the schema change.
7. If the work changes auth or session handling, load [auth setup reference](./references/auth-setup.md) and adapt [auth setup template](./assets/auth-setup.template.tsx).
8. Choose or verify the auth mode and session lifecycle.
9. Implement query subscriptions with the narrowest useful shape.
10. Add writes with the lightest durability tier that matches product requirements.
11. If schema hashes changed on a shared app, create and review a migration before deploy.
12. Validate with `pnpm dlx jazz-tools@alpha validate`.
13. Review the finished code for local-first UX, permissions correctness, migration safety, and unnecessary network-era patterns.

## Pitfalls To Catch In Reviews

- `db.updateAuthToken(null)` used as logout or user-switch logic.
- Client-side filtering used as a security boundary.
- Missing `orderBy(...)` before pagination.
- `useAll(...)` treated as `[]` while still loading.
- Broad `include(...)` trees on large result sets without need.
- Missing migration after a schema hash change on a synced app.
- Ref columns that do not follow `Id` or `_id` naming conventions.
- External JWTs whose `sub` is not the Jazz user id.
- Both `jwksUrl` and `jwtPublicKey` configured at once.
- Large files stored in `s.bytes()` instead of the file tables.
- File delete flow deleting the parent row before `files` or `file_parts`.
- Permissions relying on implicit behavior instead of explicit grants.

## References

- [Schema design reference](./references/schema-design.md)
- [Permissions review reference](./references/permissions-review.md)
- [Auth setup reference](./references/auth-setup.md)
- [Schema template](./assets/schema.ts.template)
- [Permissions template](./assets/permissions.ts.template)
- [Auth setup template](./assets/auth-setup.template.tsx)
- Prefer the Jazz docs MCP server when available so guidance matches the installed `jazz-tools` version.
- If MCP is unavailable, use the Jazz 2 docs site and verify APIs against the installed package version.