# Meridian V2 Design Brief

## Product Promise

Meridian V2 should feel like a calm project notebook for modern teams.

It is not a noisy dashboard. It is a place where notes, execution, and delivery evidence stay close together so teams can move with confidence.

## Who This Product Is For

- Small teams running multiple projects at once.
- Team leads who need a quick picture of active work and ownership.
- Contributors who need to move between notes, tasks, requirements, tests, and people without losing context.
- Designers and delivery teams who want a clear structure instead of a cluttered workbench.

## Experience Principles

- Warm and focused, not cold and corporate.
- Dense but legible, not sparse for its own sake.
- Context-rich, not navigation-heavy.
- Fast to scan, fast to edit, easy to trust.
- Consistent enough to feel calm, but not visually bland.

## Visual Direction To Preserve From The Current App

- Editorial serif headlines paired with practical interface text.
- Soft gradients and atmospheric backgrounds rather than flat panels only.
- Rounded card surfaces with light depth and quiet borders.
- Sticky shell elements that keep orientation visible.
- Compact lists, trees, and panes that reward experienced users.
- Mobile drawer navigation that mirrors desktop structure instead of creating a second IA.

## What The UI Should Feel Like

- Entering the workspace should feel like stepping into an active notebook, not opening a reporting portal.
- Organization and project spaces should feel related, but each should still have its own clear purpose.
- The personal workspace layer should feel lightweight and supportive rather than like a separate productivity surface.
- Detail panes should feel like quick working context, not modal dead ends.
- Overview pages should feel managerial and practical, not decorative.

## Screen Families

### Landing

Purpose: explain the product promise and lead a person into the workspace.

### Global Workspace Shell

Purpose: hold brand, availability state, recent or pinned shortcuts, profile access, and breadcrumbs without becoming a second work domain.

### Collection Screens

Purpose: help users scan lists of organizations, projects, tasks, people, documents, requirements, tests, and results.

### Board And Tree Screens

Purpose: support reordering, nesting, and quick decisions without hiding structure.

### Detail Panes

Purpose: let users inspect and edit a record while staying anchored in surrounding work.

### Settings Screens

Purpose: keep governance, roles, project keys, and destructive actions organized and understandable.

## Information Architecture Intent

### Top Level

- Landing
- Overview
- Organizations

### Organization Space

- Overview
- Projects
- People
- Settings

Organization space should emphasize coordination, membership, and cross-project orientation rather than duplicating project-owned execution screens.

### Project Space

- Overview
- Tasks
- Requirements
- Tests
- Test Results
- Docs
- People
- Tags
- Settings

## V1 Scope Guardrails

- Organization space is the home for shared structure, people, settings, and project navigation.
- Project space is the home for execution and knowledge workflows such as tasks, docs, requirements, tests, results, and tags.
- Personal workspace state should feel like lightweight navigation support, not a second shared operating layer.
- If future releases add organization-level docs or task flows, they should arrive as deliberate extensions rather than assumed defaults.

## Interaction Patterns To Keep Stable

- Sticky breadcrumbs at the top of the application shell.
- Left-side contextual navigation for organization and project spaces.
- Quick detail panes for editing without breaking navigation flow.
- Drawer-based navigation on mobile.
- Search, filter, and sort controls near the content they affect.
- Clear empty states that suggest the first useful action.

## Content And Naming Guidance

- Use plain, work-oriented labels such as Overview, Tasks, Docs, People, Tests, and Settings.
- Avoid clever labels that make the workspace harder to scan.
- Write helper text as if a busy team lead will read it once and move on.
- Make organization language structural and project language action-oriented.
- Keep status language stable across the product.

## Design Questions To Revisit During The Future UI Or UX Redesign

- How much of the current cozy editorial feel should remain versus become more operational?
- Should overview surfaces be more card-based, more list-based, or mixed by job to be done?
- Which detail panes should remain side sheets versus become full-page editors?
- How much hierarchy should be visible at once for docs, requirements, and tests?
- How prominent should offline and sync state be in the visual language?

## Designer Handoff Outcome

If this brief is working, a designer should be able to identify:

- the tone of the product
- the key page families
- the hierarchy of spaces
- the records that need strong visual relationships
- where density is a strength and where calm whitespace matters more