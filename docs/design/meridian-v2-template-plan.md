# Meridian V2 Template Plan

## Purpose

Build a new Meridian-style application on Jazz 2.0 that keeps the current product's strongest ideas while resetting the architecture, feature definitions, and design brief into a cleaner project template.

## Product Summary

Meridian V2 is a cozy local-first workspace for small teams.

It helps teams move from conversation to execution by keeping notes, tasks, people, requirements, tests, and results in one connected workspace.

## What Must Carry Forward From The Current App

- Warm, editorial visual tone rather than a cold enterprise dashboard.
- Clear nested navigation from workspace to organization to project.
- Dense but readable work surfaces with quick access to related records.
- A split between organization-level work and project-level work.
- Fast note-taking and task updates with minimal friction.
- Support for both overview surfaces and deeper detail panes.

## What Changes In The New App

- Replace classic Jazz CoValue modeling with Jazz 2.0 relational tables, permissions, and migrations.
- Make the architecture explicit enough to serve as a reusable project template.
- Make the behavior source of truth readable for engineering and future UI or UX design work.
- Standardize roles, permissions, route families, and screen intents.
- Constrain V1 so it has fewer moving parts: one primary membership model, lightweight workspace state, and no required backend layer.

## Delivery Principles

- Build from user behavior first, then map it into Jazz tables and permissions.
- Keep the shell and information architecture stable before polishing screen details.
- Prefer simple, explicit relational modeling over clever generic abstractions.
- Keep one obvious owner per shared record.
- Use organization membership as the default access model for V1.
- Treat recent items, pins, and similar workspace conveniences as lightweight user state.
- Add backend code only for proven server-owned workflows.
- Preserve local-first responsiveness on every screen.
- Keep the first release deliberately focused; do not front-load advanced automation.

## Suggested Delivery Phases

### Phase 1: Foundation

- [ ] Set up the new React application shell, route map, and layout system.
- [ ] Add Jazz 2.0 client setup, schema, permissions, and migrations folders.
- [ ] Add external JWT auth wiring and organization-membership-based permissions.
- [ ] Implement the landing page, global header, breadcrumbs, and workspace overview.
- [ ] Establish the core design tokens, typography, spacing, and card surfaces.
- [ ] Decide whether recent and pinned workspace state can stay local or needs a minimal shared preferences record.

### Phase 2: Workspace Structure

- [ ] Implement organizations list and organization creation.
- [ ] Implement organization overview, project list, people, and settings entry points.
- [ ] Implement project creation and project overview.
- [ ] Implement pinned organizations, pinned projects, and recent projects with the simplest storage that satisfies the user need.
- [ ] Defer organization docs and organization task flows unless the team confirms they solve a real first-release problem.

### Phase 3: Execution Workflow

- [ ] Implement project task views.
- [ ] Implement list, board, and archive task modes.
- [ ] Implement task details, assignment, status changes, ordering, and tags.
- [ ] Implement overview surfaces that surface assigned active work and cross-project summaries.

### Phase 4: Knowledge Workflow

- [ ] Implement project document trees.
- [ ] Implement document editing, save states, and navigation.
- [ ] Implement people records and project-linked people.
- [ ] Add organization reference docs only if project docs do not cover the real workflow.

### Phase 5: Quality Workflow

- [ ] Implement requirements hierarchy and quick-edit workflow.
- [ ] Implement tests hierarchy and quick-edit workflow.
- [ ] Implement test reports and per-test result tracking.
- [ ] Ensure the model supports future traceability improvements without a rewrite.

### Phase 6: Governance And Polish

- [ ] Implement org and project settings.
- [ ] Implement role management and destructive action safeguards.
- [ ] Add invitation flows only if direct membership management becomes a real bottleneck.
- [ ] Establish documentation governance for ADRs, release notes, and semantic versioning.
- [ ] Implement responsive polish for mobile drawer navigation and detail panes.
- [ ] Validate offline, reconnect, error, and empty-state behavior.

## Core Workstreams

### Product And UX

- [ ] Keep a stable information architecture and page-intent map.
- [ ] Maintain a human-friendly content model for future design handoff.
- [ ] Keep every feature file aligned with real user outcomes.

### Frontend

- [ ] Build the shared shell, sidebar, breadcrumb, and responsive panes first.
- [ ] Keep page components thin and feature components focused.
- [ ] Preserve compact, scan-friendly data presentation.

### Jazz Platform

- [ ] Model every primary user workflow as explicit Jazz tables.
- [ ] Keep one owner per shared record and avoid dual-scope tables.
- [ ] Define permissions for every table as part of the feature, not after it.
- [ ] Keep workspace conveniences out of shared schema unless cross-device value is clear.
- [ ] Avoid project-specific membership tables until organization-level access proves insufficient.
- [ ] Create migrations whenever shared data shapes change.

### Quality

- [ ] Keep the feature files as the source of truth for tests.
- [ ] Add behavior-focused E2E coverage once route families stabilize.
- [ ] Validate role-based behavior and offline behavior early.

### Documentation And Change Management

- [ ] Keep `docs/design/`, `docs/features/`, `docs/adrs/`, and `docs/release-notes/` aligned.
- [ ] Record durable architecture changes as numbered ADRs instead of hiding them in feature or implementation notes.
- [ ] Maintain one release note file per version and use semantic versioning consistently.
- [ ] Update version history in the same change as architecture, behavior, or migration changes.

## Exit Criteria For The Template

- [ ] A new team can understand the product shape from the docs alone.
- [ ] A designer can derive page families, screen intentions, and interaction priorities from the docs.
- [ ] An engineer can scaffold the Jazz 2.0 app structure from the architecture doc.
- [ ] Core workflows do not require a backend service layer.
- [ ] Each shared record has one obvious owning scope and one clear access story.
- [ ] Each primary user workflow has a matching feature file with checkboxes.