# ADR 002: Document Architecture Decisions And Version History In Repo

## Status

Accepted

## Context

Meridian V2 is intended to be a reusable application template, not a one-off implementation.

If the reasoning behind architecture, schema, routing, auth, and permission choices only lives in commits or chat history, future developers will have to rediscover core decisions repeatedly.

The template also needs a simple, visible way to track what changed between versions without reading diffs in detail.

## Decision

The Meridian V2 template will:

- keep durable architecture decisions as numbered ADRs in `docs/adrs/`
- keep human-readable release notes in `docs/release-notes/` with one file per version
- use semantic versioning for the template and document the rules in the architecture guidance
- update ADRs, release notes, and related design or feature docs in the same change when shared behavior or architecture changes

## Consequences

### Positive

- The repo becomes easier to understand quickly.
- Architecture intent stays visible even as the implementation changes.
- Version history becomes readable without relying on commit archaeology.
- Designers and developers can trace why the template changed over time.

### Tradeoffs

- Small documentation updates become part of ordinary architecture and behavior changes.
- Teams need to decide consistently when a change deserves a new ADR versus a release-note entry only.

## Follow-Up

- Keep the architecture doc aligned with the ADR and versioning rules.
- Add new ADRs when future changes alter shared system boundaries or durable technical policy.