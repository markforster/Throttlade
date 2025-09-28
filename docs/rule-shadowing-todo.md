# Rule Shadowing — Incremental TODO

Small, verifiable steps to implement conflict detection and UX.

## Phase 1 — Analyzer + Basic Surfacing

- [x] Add analyzer module `src/utils/rules/analyze.ts` exporting:
  - [x] `analyzeConflicts(rules: Rule[]): ConflictReport`
  - [x] Internal helpers: `coversMethod`, `isDefiniteSubset`, `isPossibleOverlap`, `isContainsRegexFor`, `isVeryBroadRegex` (plus `hasDotStar`, `isUniversalRegex`, `extractLiteralTokens`, `literalHead`, etc.)
- [ ] Integrate analyzer in Manage Order modal:
  - [ ] Compute `report` on `list` and update on drag/move
  - [ ] Show inline badges per item: “Never matches” (definite) / “May not match” (possible)
  - [ ] Header summary: “Conflicts: X definite, Y possible”
- [ ] Integrate analyzer in Rules table:
  - [ ] Compute `report` for the current project rules
  - [ ] Row‑level badge and tooltip listing first blocker with reason
  - [ ] Quick action in tooltip: “Move above blocker” (reorder and save)
- [ ] Safe‑guard: analyzer behind a try/catch; never blocks rendering on errors

## Phase 2 — Authoring Feedback + Dev Tools

- [ ] Add live shadowing hint to Add/Edit Rule modal:
  - [ ] Analyze against current order, excluding the rule being edited
  - [ ] Show callout if definite/possible shadowing detected
- [ ] “Preview match” helper:
  - [ ] Input URL + method; show which rule would match first (uses existing `matches`)
- [x] Unit tests (Jest):
  - [x] `coversMethod` matrix tests (Any vs specific)
  - [x] Non‑regex substring cases (equal, super/sub‑string, disjoint)
  - [x] Regex trivial containments (`.*`, `^.*$`, `.*literal.*`)
  - [x] Mixed regex/non‑regex cases (definite and possible)
  - [x] Additional boundaries: method interplay (Any vs specific, both directions), anchored regex non‑containment, disjoint hosts (regex vs regex), multiple blockers aggregation, non‑empty reason strings

## Phase 3 — Enhancements (Optional)

- [ ] Telemetry (local diagnostics): count matches per rule for last N requests
  - [ ] Surface “No matches observed” alongside analyzer result (optional)
- [ ] Performance: short‑circuit O(n²) by bucketing by method and first token
- [ ] URLPattern future‑proofing for Wildcard mode:
  - [ ] Replace substring containment with URLPattern equality/prefix rules
  - [ ] Expand examples + tests accordingly

## UX/Copy/Styles

- [ ] Badge styles: red (definite), amber (possible), small size
- [ ] Tooltips: concise reason, include method label and rule index
- [ ] Accessible labels for icons/buttons; keyboard and focus states

## Wiring Details

- [ ] `RulesTab` (`src/components/tabs/RulesTab.tsx:1`):
  - [ ] Compute once per render (memoize by rules)
  - [ ] Add badge/tooltip in first column before pattern text
  - [ ] Implement “Move above blocker” using existing save/reorder flow
- [ ] `ManageOrderModal` (`src/components/modals/ManageOrderModal.tsx:1`):
  - [ ] Analyze `list` state; recalc on drag end and on arrow move
  - [ ] Display per‑item badge and header summary
- [ ] `AddRuleModal` (`src/components/modals/AddRuleModal.tsx:1`):
  - [ ] Analyze draft values vs current ordered rules, excluding self on edit
  - [ ] Show callout when applicable

## Acceptance Checks

- [ ] With a broad top rule (`.*`), all later rules show “Never matches”
- [ ] With `api` above `/api/v1`, later shows “Never matches” (non‑regex)
- [ ] Changing order removes/introduces badges live in Manage Order modal
- [ ] Quick action successfully moves a rule above its first blocker and saves
- [ ] Add/Edit modal warns when the new rule would be shadowed
