# ADR 003: Reduce V1 To Project-Owned Core Workflows

## Status

Accepted

## Context

The original Meridian V2 template direction described a broad set of shared workflows, including people, tags, requirements, tests, results, and multiple scope-specific surfaces.

That level of ambition is useful as a long-term roadmap, but it adds too many tables, policies, routes, and edge cases to the first clean version of the application.

The template is intended to be simple, composable, readable, and easy to extend. V1 therefore needs a narrower shared model.

## Decision

The reduced V1 baseline will:

- use `organization_memberships` as the only required collaboration boundary
- keep projects as the single execution container inside an organization
- require only `organizations`, `organization_memberships`, `projects`, `tasks`, and `documents` as shared tables
- keep tasks and documents project-owned in V1
- defer project memberships, tags, custom task columns, people records, requirements, tests, results, files, and organization-owned work records by default
- keep the first release focused on overview, organizations, project overview, project tasks, project docs, and admin settings

## Consequences

### Positive

- The schema is easier to read and explain.
- Permissions stay centered on one membership model.
- Route structure and query boundaries stay smaller.
- The template becomes easier to scaffold and maintain quickly.
- Future workflows can extend the project-owned baseline instead of replacing it.

### Tradeoffs

- Some roadmap features move out of the first release.
- Teams needing richer governance or delivery evidence early will add those features in later phases.
- Organization-level work surfaces remain intentionally lightweight at first.

## Follow-Up

- Keep the software architecture and template plan aligned with this reduced V1 scope.
- Add later workflow families through new ADRs when they materially expand the shared model.