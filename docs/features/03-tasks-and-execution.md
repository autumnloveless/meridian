# Feature: Tasks And Execution

## Intent

Help teams turn ideas and meetings into active execution through readable task views and fast editing.

## User Outcomes

- A user can capture a task in the right project.
- A user can scan work in a list or board format.
- A user can assign, prioritize, reorder, archive, and update tasks quickly.
- A user can review their active work from the overview page.

## Feature Checklist

- [ ] Users can create tasks inside a project.
- [ ] Tasks support clear statuses and types.
- [ ] Users can view tasks in list, board, and archive modes.
- [ ] Users can drag and reorder work in the board and structured list views.
- [ ] Users can open a task detail pane without losing their place.
- [ ] Users can assign a task to a person or profile.
- [ ] Users can edit summary, details, status, type, custom fields, and tags.
- [ ] Users can archive or remove tasks through safe confirmation flows.
- [ ] The overview surface highlights assigned active work.

## Behavior Scenarios

- [ ] Scenario: A user captures a new task from the overview or local task screen
  Given the user is in a project and has permission to create work
  When they enter a task summary and confirm creation
  Then the new task should appear immediately in that project's task collection

- [ ] Scenario: A user switches between list and board views
  Given a project contains active tasks
  When the user changes task view mode
  Then the same work should be represented in a format optimized for scanning or flow management

- [ ] Scenario: A user updates a task from a quick detail pane
  Given the user selects a task from a list or board
  When the detail pane opens
  Then they should be able to edit key fields without leaving the current workspace view

- [ ] Scenario: A user moves a task through its lifecycle
  Given a task is in active work
  When the user changes its status or moves it between columns
  Then the task should reflect its new state immediately and remain correctly ordered

- [ ] Scenario: A user reviews their assigned work
  Given the user has active assignments
  When they open the overview page
  Then they should see a concise, actionable summary of current assigned tasks

## Design Notes

- Task views should feel practical and fast rather than ornamental.
- The board should emphasize status flow.
- The list should emphasize clarity, identifiers, ownership, and quick scanning.