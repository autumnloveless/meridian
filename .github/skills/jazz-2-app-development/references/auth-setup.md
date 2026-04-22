# Auth Setup Reference

Use this when wiring Jazz auth on the client, server, or both.

## Goal

Pick the right Jazz auth mode, keep identity stable, and avoid mixing token refresh with principal changes.

## Choose The Mode

- Use `anonymous` for read-only or no-account surfaces.
- Use `local-first` for instant onboarding, offline-first behavior, or try-before-signup flows.
- Use `external` for durable user accounts backed by JWTs.

## Client Rules

- Recreate `JazzProvider` or `Db` for login, logout, or principal switches.
- Use `db.updateAuthToken(...)` only to refresh a JWT for the same principal.
- In React, prefer `onJWTExpired` for token refresh handling.
- With local-first auth, offer a recovery mechanism before relying on it in production.
- If passkey recovery is used, keep the relying-party hostname stable.

## Server Rules

- Configure either `jwksUrl` or `jwtPublicKey`, never both.
- Use `await context.forRequest(req)` for user-scoped reads and writes.
- Use `context.asBackend()` for trusted backend work.
- Use `withAttribution*` when you want backend authority but user authorship.
- Enable `allowLocalFirstAuth` explicitly in production if that mode is required.

## Identity Linking

- If users begin in local-first auth and later sign up, verify ownership of the local-first identity first.
- Issue external JWTs whose `sub` is the Jazz user id, not an unrelated provider id.
- If the provider cannot emit the Jazz id in `sub`, add a linking flow and mint Jazz-compatible JWTs yourself.

## Better Auth Notes

- Use the Better Auth JWT plugin so Jazz can verify tokens through JWKS.
- When using the Jazz Better Auth adapter, point the adapter at the merged `app`, not a separate auth-only schema.
- Keep Better Auth tables protected by merged deny-by-default permissions for normal client sessions.
- Do not enable Better Auth experimental joins with the Jazz adapter.

## Checklist

- The chosen auth mode matches the actual product behavior.
- Provider config and server config agree on JWT verification.
- Token refresh does not attempt to switch principals on a live client.
- Identity linking preserves the Jazz user id across signup.
- Session-aware UI checks auth state correctly instead of assuming `session != null` means the token is healthy.

## Common Smells

- `db.updateAuthToken(null)` used as logout logic.
- External JWTs using the provider user id in `sub` instead of the Jazz user id.
- Local-first auth used without any recovery path.
- Backend routes using unscoped handles where request-scoped permissions are expected.