# Schema Design Reference

Use this when adding or reviewing Jazz tables, columns, and relations.

## Goal

Design a schema that fits Jazz's relational, local-first model with minimal migration risk and clear permission boundaries.

## Workflow

1. Start from the user-facing behavior.
2. Identify the main rows the user reads or writes.
3. Split each independent concern into a table.
4. Add refs for relations and keep naming consistent with Jazz rules.
5. Decide whether ownership should come from `$createdBy`, an explicit owner column, or a share or membership table.
6. Export the typed `app` handle and any helper row or insert types that simplify downstream code.
7. Run `pnpm dlx jazz-tools@alpha validate` before pushing further changes.

## Modeling Rules

- Prefer separate tables over nested JSON when data needs filtering, independent writes, or permission checks.
- Use `s.ref("table")` for a single related row and `s.array(s.ref("table"))` only when a stored ordered list is truly required.
- Keep ref column names in the required form: `taskId`, `project_id`, `memberIds`, or `member_ids`.
- Use `s.json()` for atomic blobs only. If the app edits fields independently, model them explicitly.
- Use `$createdBy` for simple creator ownership.
- Add explicit ownership columns only when ownership must transfer or differ from authorship.
- Use share or membership tables for many-to-many access models.
- For files, use the conventional `files`, `file_parts`, and app-owned linking table pattern.

## Design Questions

- What is the main table the screen subscribes to?
- Which rows are parent rows versus child rows?
- Should a child inherit access from a parent via `allowedTo.*`, or is access independent?
- Does the app need a direct ref, a reverse relation, or a separate linking table?
- Will the app need stable pagination or sorting on this table?
- Will existing synced data require a migration?

## Review Checklist

- Every relation name follows Jazz's ref naming convention.
- The schema shape supports the intended query shape without broad includes.
- Ownership and sharing needs are reflected in the schema, not deferred to UI logic.
- Large binary content is not stored inline with `s.bytes()` unless it is genuinely small.
- New columns and tables can be migrated safely if data already exists.

## Common Smells

- A JSON field that actually contains multiple independently editable sub-entities.
- A many-to-many concept modeled as repeated ids inside one row when a linking table would be clearer.
- Ownership duplicated in multiple columns without a clear source of truth.
- A list of refs used where a child table with a parent ref would make queries and permissions simpler.