# Rule Shadowing — Incremental TODO

Small, verifiable steps to implement conflict detection and UX.

## Phase 1 — Analyzer + Basic Surfacing

- [x] Add analyzer module `src/utils/rules/analyze.ts` exporting:
  - [x] `analyzeConflicts(rules: Rule[]): ConflictReport`
  - [x] Internal helpers: `coversMethod`, `isDefiniteSubset`, `isPossibleOverlap`, `isContainsRegexFor`, `isVeryBroadRegex` (plus `hasDotStar`, `isUniversalRegex`, `extractLiteralTokens`, `literalHead`, etc.)
- [x] Integrate analyzer in Manage Order modal:
  - [x] Compute `report` on `list` and update on drag/move
  - [x] Show inline badges per item: “Never matches” (definite) / “May not match” (possible)
  - [x] Header summary: “Conflicts: X definite, Y possible”
- [x] Integrate analyzer in Rules table:
  - [x] Compute `report` for the current project rules
  - [x] Row‑level badge and tooltip listing first blocker with reason
  - [x] Quick action in tooltip: “Move above blocker” (reorder and save)
- [x] Safe‑guard: analyzer behind a try/catch; never blocks rendering on errors

## Phase 2 — Authoring Feedback + Dev Tools

- [x] Add live shadowing hint to Add/Edit Rule modal:
  - [x] Analyze against current order, excluding the rule being edited
  - [x] Show callout if definite/possible shadowing detected
- [x] “Preview match” helper:
  - [x] Input URL + method; show which rule would match first (uses current semantics)
- [ ] Regex validation in Add/Edit modal: compile on change; show invalid, disable Save
- [ ] Modal alert: include first blocker info and a “Move above blocker” inline action
- [ ] Persist last preview URL/method for the session (quality of life)
- [ ] Preview “evaluation path” (ordered checks) in compact list
- [ ] “Which rule wins?” simulator panel on Rules tab (URL + Method, ordered evaluation and winner)
- [ ] Extract preview helper util `getFirstMatch(rules, url, method)` to share between modal/table
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

- [x] `RulesTab` (`src/components/tabs/RulesTab.tsx:1`):
  - [x] Compute once per render (memoize by rules)
  - [x] Add badge/tooltip in first column before pattern text
  - [x] Implement “Move above blocker” using existing save/reorder flow
- [x] `ManageOrderModal` (`src/components/modals/ManageOrderModal.tsx:1`):
  - [x] Analyze `list` state; recalc on drag end and on arrow move
  - [x] Display per‑item badge and header summary
  - [x] Add toggle to show conflicted only
- [x] `AddRuleModal` (`src/components/modals/AddRuleModal.tsx:1`):
  - [x] Analyze draft values vs current ordered rules, excluding self on edit
  - [x] Show callout when applicable
  - [ ] Add regex invalid state + disable Save
  - [ ] Add inline “Move above blocker” action

## Acceptance Checks

- [ ] With a broad top rule (`.*`), all later rules show “Never matches”
- [ ] With `api` above `/api/v1`, later shows “Never matches” (non‑regex)
- [ ] Changing order removes/introduces badges live in Manage Order modal
- [x] Quick action successfully moves a rule above its first blocker and saves
- [x] Add/Edit modal warns when the new rule would be shadowed
- [ ] Regex invalid state prevents Save and shows explanation
- [ ] Simulator panel correctly identifies winning rule and ordered evaluation
