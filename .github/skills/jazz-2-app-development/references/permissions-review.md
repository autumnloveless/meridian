# Permissions Review Reference

Use this when adding or reviewing `permissions.ts`.

## Goal

Keep access control explicit, testable, and aligned with the schema rather than scattered through components or handlers.

## Workflow

1. List every table that is readable or writable in the feature.
2. For each table, define who can read, insert, update, and delete.
3. Start with the simplest matching rule.
4. Add `anyOf`, `allOf`, `allowedTo.*`, or `exists.where(...)` only where the behavior needs it.
5. Review update rules for before and after state separately.
6. Validate locally, then deploy the new permission bundle if the policy changed.

## Review Questions

- Does every table with compiled policies have explicit grants?
- Is the rule based on creator, session identity, parent access, or share membership?
- Should updates check both `whereOld(...)` and `whereNew(...)`?
- Are JWT claims used directly through `session.where(...)` rather than copied into row columns?
- Is a client-side filter being mistaken for real access control?

## Preferred Patterns

- Use `policy.table.managedByCreator()` or `$createdBy === session.user_id` for creator-owned rows.
- Use `allowedTo.read/update/delete("parentId")` for child rows inheriting from a parent.
- Use `policy.shareTable.exists.where(...)` for explicit sharing rules.
- Use `session.where({ "claims.role": value })` for role-based or claim-based policies.
- Use `always()` only when truly intentional.
- Use `never()` instead of clever negative logic when an operation must be impossible.

## Checklist

- Reads, inserts, updates, and deletes are each intentionally handled.
- Insert rules prevent users from creating rows on behalf of other principals unless that is intended.
- Update rules preserve valid ownership or parent linkage after the change.
- Delete rules match the real business expectation for authors, owners, and admins.
- Child rows inherit access from the correct parent relation.
- Share or membership tables are themselves protected from arbitrary mutation.

## Common Smells

- Allowing insert with `always()` on a share or membership table that should be owner-managed.
- Using only `whereOld(...)` on updates when the new row could escape the intended scope.
- Depending on component conditionals instead of policy rules.
- Leaving a table without explicit grants once compiled policies are active.