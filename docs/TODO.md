# Throttlr Projects/Domains — Implementation Plan

This is the live backlog. Completed items have been moved to `TODO.v0.0.1.md`.

## Data Model & Storage

- [ ] Remove legacy `rules` key once the UI is fully switched to projects (defer)

## Popup UI

- [ ] Optional: display current project name for context (read from sync storage)
- [ ] Optional: quick project switcher (small dropdown) — defer if scope creep

## Throttling Logic Adjustments

- [ ] Cleanup: remove legacy storage reads once all consumers are project-aware

## Optional Future Enhancements (Defer)

- [ ] Project domain affinity: store `origins: string[]` per project and auto‑suggest selection based on active tab origin
- [ ] Import/export projects and rules as JSON
- [ ] Reorder projects and rule ordering per project (drag‑and‑drop)

## UX Improvements

- [x] Sticky top Navbar for global navigation
  - [x] Make header stick to top (Bootstrap `sticky-top`)
  - [x] No extra padding needed (element stays in document flow)
- [x] Introduce icons where helpful
  - [x] Add Bootstrap Icons (`react-bootstrap-icons`)
  - [x] Replace/augment icons on Navbar buttons (Add project, Delete project)
  - [x] Add icons to rules table Delete and Add rule button
  - [x] Add icon to regex warning badge
  - [x] Ensure accessible labels/tooltips remain
- [x] Restructure navigation into two tiers

  - [x] Keep top Navbar for global controls only (brand + global enable)
  - [x] Add a sub‑navbar beneath for project context
    - [x] Left: project dropdown selector
    - [x] Next: “Add project” action
  - [x] Move project properties below sub‑navbar
    - [x] Project enabled switch
    - [x] Delete project button
  - [x] Preserve current behaviors and storage updates

- [x] Make project sub‑navbar sticky under main navbar
- [x] Project selector compact with status indicator (🟢/🔴) and status‑colored border
- [x] Replace Add Rule accordion with modal (shared add/edit form)
- [x] Rules method filter dropdown with multi‑select checkboxes (Clear / Select all)
- [x] Apply method filtering to rules table with informative empty states
- [x] Rules table columns: URL/Path (flex), Method, Match Mode, Delay, Actions
- [x] Method badges: color‑coded + method‑specific icons (GET/POST/PUT/PATCH/DELETE)
- [x] DELETE method badge uses FileX icon to avoid confusion with action delete
- [x] PATCH method badge uses PatchCheck icon (not Pencil)
- [x] Match Mode badges outlined with icons (Wildcard=Asterisk, Regex=BracesAsterisk)
- [x] Rules actions icon‑only (Edit/Delete) with visually‑hidden labels
- [x] Help tooltip icon for rules ordering next to “Current rules”

## QA & Validation

- [ ] Fresh install: create project, add rules, verify throttling
- [ ] Upgrade with existing rules: migration creates default project, rules preserved
- [ ] Global toggle OFF: no throttling regardless of project toggle
- [ ] Global toggle ON + project enabled: throttling applies
- [ ] Global toggle ON + project disabled: no throttling
- [ ] Project switching updates effective rules immediately on open pages
- [ ] Add/delete project flows; selection behaves as expected
- [ ] Verify content/inpage reactivity: storage updates propagate and STATE messages reflect changes
- [ ] Rules UI: Add via modal works; Edit saves updates in place
- [ ] Filters: selecting methods filters table; Clear/Select all work; empty states render correctly

## Rollout Steps

- [ ] Final polish, docs, and screenshots

## Bugs

- [ ] Project dropdown closes when toggling a project's enable switch in the menu. Expected: menu stays open on toggle; only selecting a project name should close it. Current attempt with `autoClose={false}` and controlled `show` did not resolve; investigate event handling in React Bootstrap Dropdown.
- [ ] Project dropdown row selection: user must click exactly on the text to select a project. Expected: clicking anywhere on the row (except the toggle) selects the project. Make the entire row clickable while keeping the toggle interactive without closing the dropdown.

## Refactoring (Options Dashboard)

The options page has been partially modularised. Track remaining cleanup and note what is already complete.

### Components (`src/components`)

- [x] ProjectDropdown component extracted with controlled `open` state and toggle wiring
- [ ] Rules header/filter: consider splitting the title + filter controls from `RulesTab` for reuse
- [ ] MethodFilterDropdown: encapsulate the multi-select checkbox UI so it can be reused and tested
- [ ] RulesTable: extract the table-only rendering from `RulesTab` to simplify stateful logic
- [x] AddRuleModal: shared add/edit modal (lives in `src/components/modals/AddRuleModal.tsx`)
- [x] DeleteRuleModal: confirm dialog for rule deletion
- [x] Project modals: add/delete project handled in dedicated components

### Hooks (`src/hooks`)

- [x] `useGlobalEnabled` extracted from the options page
- [ ] `useProjects`: fold additional helpers into `useProjectSelector` (setEnabled, add/delete)
- [ ] `useRules`: expand `useProjectRules` with `add/update/remove` helpers and derived filtering
- [ ] `useMethodFilter`: encapsulate HTTP method filter state and helpers
- [ ] `useDropdownControlled`: helper for complex dropdowns that should not autoclose

### Utilities (`src/utils`)

- [x] `rules-ui.tsx` houses method badges/icons and match-mode classes
- [ ] Add normalize helpers (e.g., method casing) where duplication remains
- [ ] Table layout helpers/constants for consistent column ordering

### Styles

- [ ] Move rules-table and dropdown hover overrides into a dedicated stylesheet (e.g., `src/styles/options.css`) imported by the dashboard only

### File organisation goals

- [x] Reduce the options entry file to a light orchestrator (~150–250 lines)
- [x] Ensure `src/components`, `src/hooks`, and `src/utils` host the extracted logic
- [ ] Establish a `src/styles` folder for options-specific CSS overrides

### Incremental migration plan

- [x] Extract shared utilities first (completed for rules UI helpers)
- [ ] Promote hooks (`useProjectSelector` → `useProjects`, `useProjectRules` → `useRules`)
- [ ] Extract method filter + header components from `RulesTab`
- [x] Extract modals (rule add/edit, delete confirmations, project modals)
- [ ] Extract the table component to finish the split between state and presentation

## Test Coverage

Immediate/unit-level (pre-refactor)

- [x] utils/rules-ui

  - [x] methodVariant mapping (GET/POST/PUT/PATCH/DELETE/others)
  - [x] methodIcon mapping (returns named icons)
  - [x] matchModeBadgeClasses (regex vs wildcard)

- [ ] storage schema helpers (src/storage.ts)
  - [ ] ensureSchemaMigration (default project creation, globalEnabled carry-over)
  - [ ] getEffectiveState (project selection + effectiveEnabled)
  - [ ] repairCurrentProjectId (empty list and invalid id cases)

Component-level (post-refactor preferred)

- [ ] ProjectDropdown

  - [ ] Renders selected project + inline toggle
  - [ ] Menu toggles do not close menu; clicking name selects and closes
  - [ ] Calls onSelect/onToggle with correct ids

- [ ] MethodFilterDropdown

  - [ ] Check/uncheck updates selected set; Clear/Select all work
  - [ ] Dropdown remains open on checkbox interaction

- [ ] AddEditRuleModal

  - [ ] Add mode submits new rule shape
  - [ ] Edit mode preloads values and submits update (same id)

- [ ] ConfirmDeleteRuleModal

  - [ ] Shows pattern + method, Cancel/Delete behaviors

- [ ] RulesTable
  - [ ] Renders method/match badges and action buttons
  - [ ] Honors filteredRules and empty states messages

Integration smoke (optional)

- [ ] options.tsx renders without throwing (jsdom)
- [ ] Clicking Add rule opens modal; submitting calls handler
- [ ] Toggling global enabled updates storage via mock

## Advanced Table Features (Ambitious)

These features add richer control to the rules list. They should be additive and must not change the underlying storage order or existing behavior unless explicitly enabled. All features should cooperate with current method filters and per‑project selection.

### Free‑Text Search Filtering

Provide a search box in place of the “Current rules” title (with a clear X button) that filters rules as the user types. Matching is simple “contains” on pattern (and optionally method/mode), case‑insensitive. Clearing restores full list.

- [ ] Replace title area with an input group (React Bootstrap `InputGroup` + `Form.Control`) and a clear button (X)
- [ ] Add `searchQuery` state and debounce updates (e.g., 150–250ms) for performance
- [ ] Implement case‑insensitive “contains” match on pattern (and optionally include method/match mode text)
- [ ] Combine with existing method filters (AND logic): first filter by methods, then by search text
- [ ] Preserve empty states (“no rules”, “no matches”) with search context
- [ ] A11y: add `aria-label`/placeholder; Esc clears or blurs input

### Grouping (by Method or Match Mode)

Add an optional “Group by” control next to the filter icon to group rules in the table. When grouping is off, render a single flat list (current behavior). When grouping is on, partition the filtered rules into labeled groups by Method or by Match Mode. Filters still apply; groups only affect presentation. Grouping must not mutate stored order.

- [ ] Add “Group by” control (Dropdown with: None, Method, Match Mode)
- [ ] Derive grouped data structure from already‑filtered rules: `{ heading, items[] }[]`
- [ ] Render groups with small headers (sticky within card optional) and tables/rows per group (or a single table with grouped sections)
- [ ] Keep rule action buttons functional; group headers show item counts
- [ ] Ensure grouping works with search and method filters simultaneously
- [ ] A11y: mark group headers with appropriate semantics

### Sorting (View‑Only)

Allow users to change the display sort without changing the underlying storage order. Primary order remains the stored rule order; alternate view sorts include alphabetical (by pattern) and by method. Implement using a derived array or stable keys/indices; never write sorted order back to storage unless we later add explicit reordering.

- [ ] Add Sort control (Dropdown with: Rule Order [default], Alphabetical, Method)
- [ ] Apply sorting after filtering (and grouping if enabled) to the rendered collection only
- [ ] Ensure stable rendering by keying rows by `rule.id`
- [ ] Confirm that no storage mutations occur when changing sort
- [ ] Document precedence (Filter → Group → Sort render)

## Rule Management Enhancements (Ambitious)

These features refine how users manage rules themselves (order, safety, per‑rule activation). They should integrate with existing project storage and broadcasting without disrupting current behaviors unless explicitly invoked.

### Reordering Rules (Iteration 1)

Let users change rule order (which determines match precedence). Start with a simple modal UI rather than inline drag‑and‑drop; consider DnD in a later iteration.

- [ ] Add a “Manage order” button near the rules header
- [ ] Open a modal listing current rules (pattern + method) in order
- [ ] Reorder mechanics (v1):
  - [ ] Provide Up/Down controls to move a selected rule
  - [ ] Optional: adopt a DnD library for smoother UX in a later pass
- [ ] Persist order by writing the reordered array back to the selected project’s `rules`
- [ ] Do not mutate rule contents (ids unchanged); only array order changes
- [ ] Close modal on save; bridge rebroadcasts; runtime throttling reflects new order
- [ ] A11y: keyboard support for moving items; focus management in modal

### Confirm Delete Rule

Prevent accidental deletions by confirming intent before removing a rule.

- [ ] Replace direct delete with a confirm modal
- [ ] Modal shows rule summary (pattern + method)
- [ ] Buttons: Cancel (default) and Delete (danger)
- [ ] Keyboard: Esc cancels; Enter confirms when Delete focused
- [ ] After confirm, remove rule and update storage; table refreshes

### Enable / Disable Per Rule

Allow turning individual rules on/off without deleting them. Disabled rules should be ignored by matching logic.

- [ ] Extend `Rule` type with `enabled?: boolean` (default true)
- [ ] Migration: on load, treat missing `enabled` as true (no storage rewrite required initially)
- [ ] UI: add a toggle column after Actions to enable/disable each rule
- [ ] Visual cue for disabled rules (e.g., muted row or badge)
- [ ] Matching logic: update `inpage.ts` and `content.ts` matchers to skip disabled rules
- [ ] Bridge payload remains the same list; rules with `enabled=false` are still sent but ignored by matchers

## Background Module Refactor

- [ ] Audit current responsibilities in `src/background.ts` and confirm boundaries for separate modules (ports, lifecycle, dashboard, message routing).
- [ ] Extract dashboard port wiring into `src/background/dashboardPorts.ts`; expose a `setupDashboardPorts()` initializer.
- [ ] Create `src/background/lifecycle.ts` for install/startup logic with a shared `initializeExtension()` used by both listeners.
- [ ] Move runtime message handlers into `src/background/messages.ts`, using a message-type map so each handler is isolated and testable.
- [ ] Encapsulate request tracking handlers in a helper (e.g., `handleRequestMessage`) that updates inflight/recent state and notifies dashboards.
- [ ] Update `src/background.ts` to act as a thin entrypoint that imports and registers the extracted initializers.
- [ ] Add unit tests (where practical) for the new modules, particularly message and request handler utilities.
