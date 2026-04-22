# ADR 001: Adopt Jazz V2 Local-First Workspace Architecture

## Status

Accepted

## Context

The current Meridian application is built on the classic Jazz library and already demonstrates a valuable product shape: a cozy local-first workspace with organization and project shells, compact execution views, and connected knowledge artifacts.

The new application needs to preserve that product shape while moving to Jazz 2.0 and becoming a reusable project template.

## Decision

The new Meridian template will:

- use Jazz 2.0 relational tables rather than classic CoValue-first modeling
- keep `schema.ts`, `permissions.ts`, and `migrations/` as first-class project artifacts
- model organization and project scope explicitly, while keeping the personal workspace layer lightweight
- use organization membership as the default V1 access boundary
- use external JWT auth as the default production mode
- avoid a required backend service layer for core workflows
- preserve the current app's layered shell, contextual navigation, and local-first user experience

## Consequences

### Positive

- The data model becomes easier to reason about and document.
- Permissions become explicit and reviewable.
- The template aligns with Jazz 2.0's documented production patterns.
- The new app remains compatible with the current product's key behaviors and visual direction.
- The first implementation stays easier to scaffold because it starts with fewer default moving parts.

### Tradeoffs

- Existing classic Jazz structures are not portable one-for-one.
- Rich text behavior must be redefined as part of the new relational design.
- Migration from V1 data, if desired later, will require a deliberate migration project rather than a passive carry-over.
- Some higher-flexibility patterns, such as project-specific memberships or organization-scoped execution data, are intentionally deferred until they are justified.

## Follow-Up

- Keep feature files aligned with this architecture decision.
- Revisit the auth recommendation only if the team selects a different JWT-compatible provider strategy.
- Add a new ADR before introducing a required backend service layer or a second default membership model.