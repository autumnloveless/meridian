# Feature Files Guide

These files describe the expected user behavior of Meridian V2 in a form that is easy to track during implementation and easy to read during future design work.

## Start Here

If you are new to the project, read [00-feature-summary-and-breakdown.md](00-feature-summary-and-breakdown.md) first.

That file is the high-level entry point for designers and developers. It explains the application concept, main spaces, feature groups, and links outward to the more detailed files only when needed.

## How To Use These Files

- Treat each file as a product contract for one slice of the system.
- Keep checkbox status current as implementation progresses.
- Update the feature files when behavior changes.
- Use the scenarios as the basis for design reviews, QA, and end-to-end testing.

## Format

Each file includes:

- a short intent statement
- user outcomes
- feature checklists with checkboxes
- behavior scenarios written in a Given, When, Then style
- design notes that help future UI or UX redesign work

## File Order

- [00-feature-summary-and-breakdown.md](00-feature-summary-and-breakdown.md)
- [01-foundation-and-navigation.md](01-foundation-and-navigation.md)
- [02-organizations-and-projects.md](02-organizations-and-projects.md)
- [03-tasks-and-execution.md](03-tasks-and-execution.md)
- [04-documents-and-knowledge.md](04-documents-and-knowledge.md)
- [05-people-collaboration-and-permissions.md](05-people-collaboration-and-permissions.md)
- [06-requirements-tests-and-results.md](06-requirements-tests-and-results.md)
- [07-settings-tags-and-governance.md](07-settings-tags-and-governance.md)

## Status Convention

- `[ ]` not started or not yet verified
- `[x]` implemented and verified