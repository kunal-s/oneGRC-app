---
type: gap
id: G-02
area: Identity and authentication
priority: Essential
status: planned
tags: [gap, floor]
aliases: [G-02]
---

# G-02 — Identity and authentication

Prototype: the persona switcher is the only "auth". Production: real authentication (SSO/MFA/session management); the switcher becomes a view selector, never an impersonation device. A floor item.

- Decision: [[ADR-002-authorization-seam]] — authentication is a replaceable seam; dev impersonation is a **server-side, logged** act
- Closed by: [[phase-0-proof-chain-spike#P0-05|P0-05]] sessions + dev impersonation · [[phase-0-proof-chain-spike#P0-09|P0-09]] persona → server identity · [[phase-1-platform-floor#P1-16|P1-16]] dev login · [[phase-5-intelligence-admin-handoff#P5-07|P5-07]] OIDC against the client IdP
- Spec: [[functional-spec#19.2 The gap register|§19.2]]
