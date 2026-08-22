# ADR-010 · Committee chairs review; they do not close cases

**Status:** Accepted · **Date:** 2026-08-22 · **Overrides:** [[functional-spec]] §4.10

## Context

The v2.0 authority matrix granted the **Audit Committee Chair** authority to *close* a speak-up report
and *close* a fraud case. That contradicted §4.7, which states a committee chair **reviews; they do
not operate the platform**, and explains that offering a non-executive an operational screen invites
exactly the involvement the three-lines model exists to prevent.

## Decision

Remove Audit Committee Chair from both close actions.

- `Close a report` → Compliance Manager, Auditor (SoD)
- `Close a case` → Compliance Manager, Risk Manager, Executive (SoD)

The chair **keeps statutory direct access** to the speak-up channel — reading, oversight and
challenge. That access is a legal requirement and is untouched.

**Access to read is not authority to dispose.** Closing a case is an operational act belonging to the
ethics office and internal audit. In practice a non-executive would never perform closure in the tool,
and a matrix implying they might is a matrix inviting the wrong involvement.

## Consequences

- No loss of oversight: the chair still sees every case they are entitled to see, including sealed
  ones counted honestly (§4.12), and the exception and findings registers in their pack.
- The §4.9 visibility matrix is unchanged — this is about **authority**, not visibility.

## Links

[[functional-spec]] §4.7, §4.10, §4.12 · [[ADR-007-roles-and-authority]]
