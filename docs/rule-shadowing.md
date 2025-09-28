# Rule Shadowing Detection: Design and UX

This document defines how Throttlade detects and communicates conflicting (shadowed) rules based on the current matching semantics, and proposes concrete UX updates to surface the information in the Rules table, Manage Order modal, and Add/Edit Rule modal.

## Overview

- Rules are evaluated top‑down; the first match wins.
- A later rule can be “shadowed” by an earlier rule, making it ineffective.
- We classify shadowing with two confidence levels:
  - Definite: we can prove every request matched by the later rule will be matched first by an earlier rule.
  - Possible: strong overlap indicators exist, but not a formal proof (primarily with complex regex).
- We analyze the rules list whenever order changes or rules are added/edited and display clear indicators with actionable suggestions.

## Current Matching Semantics (as implemented)

- Non‑regex rules use substring matching: `url.includes(pattern)`.
- Regex rules use `new RegExp(pattern).test(url)`.
- Missing `method` means “Any”, otherwise compared case‑insensitively.

References:

- `src/utils/rules/matches.ts:1`
- `src/types/types.ts:3`

## Definitions

- Earlier rule: lower index (closer to top) in the ordered list.
- Later rule: higher index (closer to bottom).
- Covers method: the earlier rule’s method is `Any` or equals the later rule’s method (case‑insensitive).
- Definite shadowing: the earlier rule covers method and its match predicate is a superset of the later rule’s predicate under current semantics.
- Possible shadowing: heuristic evidence suggests overlap, but not proved to be a superset.

## Algorithm

Given ordered rules `R[0..n-1]` (0 = highest priority):

For each later rule `i` from 1..n-1:

- Initialize empty `definiteBlockers` and `possibleBlockers`.
- For each earlier rule `j` from 0..i-1:
  1. If `coversMethod(R[j], R[i])` is false → continue.
  2. If `isDefiniteSubset(R[j], R[i])` → add `j` to `definiteBlockers`.
  3. Else if `isPossibleOverlap(R[j], R[i])` → add `j` to `possibleBlockers`.
- Classify rule `i`:
  - If `definiteBlockers` non‑empty → “Never matches”.
  - Else if `possibleBlockers` non‑empty → “May not match”.
  - Else → no warning.

Time complexity: O(n²). Typical rule counts are small; if needed, we can bucket comparisons by method to reduce work.

### coversMethod(a, b)

- Normalize to uppercase.
- Returns true if `a.method` is empty/undefined (Any) or `a.method === b.method`.

### isDefiniteSubset(earlier, later)

Cases that prove superset under current semantics:

- Methods covered AND:
  1. Both non‑regex:
     - `earlier.pattern === later.pattern`.
     - `earlier.pattern` is a substring of `later.pattern` (because match is `url.includes(pattern)`).
  2. Both regex:
     - `earlier.pattern === later.pattern`.
     - `earlier.pattern` is trivially universal (e.g., `.*`, `^.*$`).
  3. Regex vs non‑regex:
     - `earlier` is regex equivalent to contains of the later literal, i.e. `.*LITERAL.*` (with proper escaping).
  4. Non‑regex vs regex:
     - `later` is regex equivalent to contains of the earlier literal, i.e. `.*LITERAL.*`.

Note: We only mark equality or trivial containment for regex as “definite”. We avoid attempting general regex inclusion proofs.

### isPossibleOverlap(earlier, later)

Heuristics when regex is involved or patterns are broad:

- Methods covered AND any of:
  - Regex contains `.*` and few literals (broad).
  - Regex source includes the other rule’s literal (outside character classes) → likely contains.
  - Non‑regex literal is a substring of a literal segment in the regex.

These are warnings, not proofs.

## Data Structures

We expose a lightweight analyzer API:

- `analyzeConflicts(rules: Rule[]): ConflictReport`
- `ConflictReport` (per rule):
  - `definiteBlockers: string[]` — earlier rule ids that definitely shadow this rule.
  - `possibleBlockers: string[]` — earlier rule ids that may shadow this rule.
  - `reasons: { blockerId: string; kind: 'definite'|'possible'; method: string; detail: string }[]` — human‑readable context for tooltips.

Helper functions (internal):

- `coversMethod(a?: string, b?: string): boolean`
- `isDefiniteSubset(a: Rule, b: Rule): boolean`
- `isPossibleOverlap(a: Rule, b: Rule): boolean`
- `isContainsRegexFor(literal: string, regexSrc: string): boolean`
- `isVeryBroadRegex(regexSrc: string): boolean`

## UX Design

### Rules Table (`src/components/tabs/RulesTab.tsx:1`)

- Row‑level badge to the left of the pattern:
  - Definite: red badge “Never matches”.
  - Possible: amber badge “May not match”.
- Tooltip on badge lists the first 1–2 blockers: “Blocked by Rule #k: [pattern] (Method). Reason: broader pattern above.”
- Quick action in tooltip: “Move above Rule #k” — reorders the current rule to just above the first blocker and saves.

### Manage Order Modal (`src/components/modals/ManageOrderModal.tsx:1`)

- Analyze the `list` state so indicators update live while dragging.
- Each item shows an inline compact badge:
  - Definite: “Never matches”.
  - Possible: “May not match”.
- Modal header summary: “Conflicts: X definite, Y possible”.
- Optional control: a toggle to show only conflicted rules.

### Add/Edit Rule Modal (`src/components/modals/AddRuleModal.tsx:1`)

- Live analysis when `pattern` and `method` are non‑empty:
  - If the new/edited rule would be shadowed in current order, show a callout:
    - “This rule will never match due to Rule #k: [pattern] (Method). Consider moving it above or narrowing the pattern.”
- Optional “Preview” helper: enter URL + method → shows which rule would match first with current ordering.

### Optional “Simulate” Panel

- In the options page, a small tester: input URL + method to visualize evaluation order and the winning rule.

## Examples (with current semantics)

- Earlier non‑regex `"api"` vs later non‑regex `"/api/v1"` → definite shadowing: `"api"` is a substring of `"/api/v1"`.
- Earlier regex `".*api.*"` vs later non‑regex `"/api/v1"` → definite shadowing.
- Earlier Any method vs later GET, same pattern relationship → definite shadowing (method superset).
- Earlier GET vs later POST, identical pattern → not shadowed (methods disjoint).

## Limitations

- Regex inclusion is undecidable in general; we only mark trivial containments as definite.
- Heuristics may cause false positives for “possible” warnings with complex regexes.
- Current non‑regex semantics are substring matches; future migration to URLPattern will change containment logic.

## Future‑Proofing for URLPattern

If Wildcard mode switches to URLPattern:

- Replace substring rules with:
  - Exact equality
  - Prefix/scope containment (e.g., `https://a.com/api/*` subsumes `https://a.com/api/v1/*`).
- Keep regex logic as‑is for trivial containments; prefer “possible” otherwise.

## Testing Strategy

- Unit tests for `analyzeConflicts` covering:
  - Method coverage matrix (Any vs specific, specific vs specific).
  - Non‑regex substring cases (equal, super/sub‑string, disjoint).
  - Regex trivial containments (`.*`, `^.*$`, `.*literal.*`).
  - Mixed regex/non‑regex cases (definite and possible).
- Snapshot tests for UI badges in Rules table and Manage Order modal given mocked `ConflictReport`.

## Accessibility

- Badges use text labels (“Never matches”, “May not match”) with appropriate colors and `aria-label` on the icon if used.
- Tooltips are keyboard‑triggerable; quick‑action is a real button with focus styles.
