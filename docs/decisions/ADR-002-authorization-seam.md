# ADR-002 · Authorization seam now, authentication later

**Status:** Accepted · **Date:** 2026-08-22

## Context

The prototype persona switcher is its only "auth" (G-02), and authority is checked **in the client**
(G-03). The customer will federate into **their own identity provider** (OIDC/SAML) at deployment.
Building our own login now would likely be discarded, and a managed provider (Clerk/Auth0) would
fight an on-prem client IdP.

## Decision

Separate **authentication** (who you are — theirs) from **authorization** (what you may do — ours),
and build only the second now.

1. Every API request resolves to a server-side identity context: `{ personId, roles, department, lod }`.
2. The §4.10 authority matrix and separation of duties are enforced **server-side**, from day one.
   The client check degrades to an affordance (hiding a button), never the control.
3. Authentication sits behind a replaceable interface. In dev it is an impersonation endpoint that
   sets the server identity context — the persona switcher, but honest. A real OIDC adapter replaces
   that one module later; the authorization layer beneath is untouched.

## Consequences

- The persona switcher becomes a **view selector** in production, never an impersonation device
  (§21.17). Any genuine support impersonation is a separate, logged capability.
- Retrofitting server-side authorization later would mean re-auditing every endpoint. Doing it first
  is the point of the spike.
- We can demo and pilot without an IdP, and integrate one without redesign.

## Links

[[build-plan]] P0-05, P0-06 · [[functional-spec]] §4.10, §4.11, §19.2 G-02/G-03
