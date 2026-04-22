# Feature: Organizations And Projects

## Intent

Give teams a clear home for shared work, with organizations acting as the broad workspace layer and projects acting as the delivery layer.

## User Outcomes

- A user can create and browse organizations.
- A user can create projects inside an organization.
- A user can tell the difference between organization structure and project delivery work.
- A user can move into a project without losing parent context.

## Feature Checklist

- [ ] Users can see all organizations they belong to.
- [ ] Users can create a new organization.
- [ ] Organization cards or rows show enough information to choose the right workspace.
- [ ] Users can open an organization overview page.
- [ ] Users can browse projects within an organization.
- [ ] Users can create a project from inside an organization.
- [ ] A project inherits its parent organization context in the UI.
- [ ] Users can pin important organizations and projects for quick access.
- [ ] Recent project activity is reflected in global navigation.

## Behavior Scenarios

- [ ] Scenario: A user creates a new organization
  Given the user has permission to create an organization
  When they provide an organization name and confirm creation
  Then the new organization should appear in the organizations list and be ready for project setup

- [ ] Scenario: A user opens an organization
  Given the user belongs to multiple organizations
  When they select one organization
  Then they should enter a workspace with overview, projects, people, and settings entry points

- [ ] Scenario: A user creates a new project
  Given the user is inside an organization and has create permission
  When they submit a project name
  Then the project should appear in that organization and be accessible from both the project list and global shortcuts

- [ ] Scenario: A user navigates from organization to project
  Given the user is reviewing organization context
  When they open a project
  Then the UI should retain the parent organization context while shifting the sidebar to project-level work

- [ ] Scenario: A user returns to a frequently used project
  Given the user has recently opened a project or pinned it
  When they use the header shortcuts
  Then they should reach that project with minimal navigation effort

## Design Notes

- Organization screens should feel like shared team territory and cross-project coordination.
- Project screens should feel more operational and execution-focused.
- Use clear hierarchy markers so the user always knows whether they are looking at organization or project work.