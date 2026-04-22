# Meridian V2 Template Docs

This folder is the planning and behavior source of truth for a new Meridian-style application built on Jazz 2.0.

The intent is to preserve the best parts of the current Meridian product:

- a warm, editorial workspace aesthetic
- a clear organization and project hierarchy
- compact, high-signal work surfaces for docs, tasks, people, requirements, tests, and results
- local-first collaboration and offline-friendly behavior

## V1 Shape

The current template assumes a deliberately simplified V1:

- organization spaces hold shared structure, membership, people, settings, and cross-project orientation
- project spaces hold the main execution and knowledge workflows
- personal workspace behavior stays lightweight and mostly limited to navigation, recents, pins, and profile access
- backend-owned workflows are deferred unless a concrete product need justifies them

Use this folder in three ways:

1. Use the design docs to align product, engineering, and UI or UX design.
2. Use the feature files as the implementation checklist and behavior contract.
3. Use the ADRs to understand which architecture choices are intentional and should remain stable unless consciously revisited.

## File Map

- [features/00-feature-summary-and-breakdown.md](features/00-feature-summary-and-breakdown.md)
- [design/meridian-v2-template-plan.md](design/meridian-v2-template-plan.md)
- [design/meridian-v2-design-brief.md](design/meridian-v2-design-brief.md)
- [design/meridian-v2-software-architecture.md](design/meridian-v2-software-architecture.md)
- [features/README.md](features/README.md)
- [features/01-foundation-and-navigation.md](features/01-foundation-and-navigation.md)
- [features/02-organizations-and-projects.md](features/02-organizations-and-projects.md)
- [features/03-tasks-and-execution.md](features/03-tasks-and-execution.md)
- [features/04-documents-and-knowledge.md](features/04-documents-and-knowledge.md)
- [features/05-people-collaboration-and-permissions.md](features/05-people-collaboration-and-permissions.md)
- [features/06-requirements-tests-and-results.md](features/06-requirements-tests-and-results.md)
- [features/07-settings-tags-and-governance.md](features/07-settings-tags-and-governance.md)
- [adrs/001-adopt-jazz-v2-local-first-workspace.md](adrs/001-adopt-jazz-v2-local-first-workspace.md)
- [adrs/002-document-architecture-decisions-and-version-history.md](adrs/002-document-architecture-decisions-and-version-history.md)
- [adrs/003-reduce-v1-to-project-owned-core-workflows.md](adrs/003-reduce-v1-to-project-owned-core-workflows.md)
- [release-notes/0.0.1.md](release-notes/0.0.1.md)

## Status Tracking

Feature files use Markdown checkboxes so the team can track scope directly in the behavior docs.

- `[ ]` not started or not yet verified
- `[x]` implemented and verified

These docs are intentionally written to be readable by engineering, product, and future UI or UX design collaborators.

## Recommended Reading Order

1. [features/00-feature-summary-and-breakdown.md](features/00-feature-summary-and-breakdown.md)
2. [design/meridian-v2-design-brief.md](design/meridian-v2-design-brief.md)
3. [design/meridian-v2-software-architecture.md](design/meridian-v2-software-architecture.md)
4. The relevant detailed feature file in [features/](features/README.md)

If the docs ever seem to disagree, treat the architecture doc and ADRs as the durable source of truth for scope boundaries.