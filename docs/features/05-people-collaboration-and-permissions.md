# Feature: People, Collaboration, And Permissions

## Intent

Make it easy to understand who is involved, who can do what, and how people connect to the work.

## User Outcomes

- A user can maintain people records for an organization.
- A user can link relevant people into a project context.
- A user can understand and manage organization membership roles.
- A user can trust that permissions match workspace boundaries.

## Feature Checklist

- [ ] Users can view organization people records.
- [ ] Users can create a person record with notes and structured fields.
- [ ] Users can open person details from organization and project context.
- [ ] Users can link organization people into a project.
- [ ] Users can manage organization access through roles.
- [ ] Project access inherits from organization membership by default.
- [ ] Sensitive settings and destructive actions are limited by role.
- [ ] The current user has a visible profile and account access point.

## Behavior Scenarios

- [ ] Scenario: A user adds a new person to an organization
  Given the user has permission to manage people
  When they create a person record
  Then the person should be available in the organization people list and ready to be linked to projects

- [ ] Scenario: A user links people to a project
  Given a project needs the right stakeholders visible
  When the user links one or more people into that project
  Then those people should appear in the project people surface without losing their organization identity

- [ ] Scenario: A manager updates role access
  Given the workspace has multiple collaborators
  When a manager or admin changes a member role
  Then the new permissions should apply across the organization and its projects and protected actions should reflect that change

- [ ] Scenario: A user opens their profile controls
  Given the user is in the workspace shell
  When they access their profile area
  Then they should find account and session-related actions in one consistent place

## Design Notes

- People screens should feel like practical team context, not a CRM.
- Permissions flows should be legible and explicit.
- Project-specific membership rules are intentionally deferred in V1 unless a real access problem requires them.
- Membership roles should use plain language and strong visual hierarchy.