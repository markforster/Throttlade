# Throttlr Projects/Domains — Implementation Plan

This document breaks the “projects/domains” feature into small, iterative tasks. Each task is a checklist item you can pick up independently. No code has been changed yet — this is the plan.

## Goals

- [ ] Add first‑class “projects” (aka domains) to group throttling rules.
- [ ] Let users select, add, and delete projects in the dashboard.
- [ ] Persist rules per project; newly added rules are stored under the selected project.
- [ ] Throttling applies only to the selected project’s rules.
- [ ] Global enable toggle disables throttling across all projects when off; when on, effective throttling also requires the selected project to be enabled (per‑project enable/disable).
- [ ] Keep current UX flow (add rule, list rules), but improve structure (collapsed add form if the project already has rules).

## Data Model & Storage

- [x] Define storage schema (sync):
  - `globalEnabled: boolean`
  - `projects: Array<{ id: string, name: string, enabled: boolean, rules: Rule[] }>`
  - `currentProjectId: string | null`
- [ ] Migration step:
  - [x] Create default project from legacy `rules` (if present)
  - [x] Set `globalEnabled` from legacy `enabled` (default true)
  - [x] Set `currentProjectId` to the new project’s id
  - [ ] Remove legacy `rules` key once the UI is fully switched to projects (defer)
  - [x] Stamp `schemaVersion = 1`
- [ ] Utilities:
  - [x] Add typed `getState`/`setState` helpers
  - [x] Add idempotent `ensureSchemaMigration()`
  - [x] Add `getEffectiveState()` helper (compute selected project + enabled)

## Background + Bridge + Page State Flow

- [x] Compute and broadcast “effective state” to in‑page script:
  - Source: `globalEnabled`, `projects`, `currentProjectId`
  - Effective project: find by `currentProjectId`; if missing, fallback to first project or none
  - `effectiveEnabled = globalEnabled && project.enabled`
  - Send only the selected project’s rules and `effectiveEnabled`
- [x] Update `content-bridge.ts` message payload to include `projectId` (optional)
- [ ] Ensure `content.ts`/`inpage.ts` use `effectiveEnabled` and only the selected project’s rules.
  - [x] content.ts listens to STATE and prefers broadcasted rules/enabled over legacy storage
  - [x] inpage.ts already consumes STATE rules/enabled
  - [ ] Later: remove direct storage reads once all producers/consumers are project-aware
- [x] Popup writes both `enabled` (legacy) and `globalEnabled` (schema) so effective state reflects global toggle
- [x] Reverify listeners for storage changes; recompute and rebroadcast on `globalEnabled`, `projects`, `currentProjectId`, and legacy keys.
- [x] Hook migration into background `onInstalled`/`onStartup` before reinjecting scripts.
  - [x] Log computed effective state at startup/install (diagnostics only)

## Dashboard UI (Options Page)

- [ ] Add a top navigation bar (React Bootstrap `Navbar`) with:
  - [x] Read-only current project name
  - [x] Project selector (Bootstrap `Form.Select`) bound to `currentProjectId`
  - [x] “Add project” button (opens modal)
  - [x] Project enable/disable indicator (read-only Badge)
  - [x] Per‑project enable toggle (switch) that updates selected project's `enabled`
- [ ] “Add project” modal (React Bootstrap `Modal`):
  - [x] Fields: name (required)
  - [x] On save: create `{ id, name, enabled: true, rules: [] }`, set as `currentProjectId`
- [ ] “Delete project” affordance:
  - [x] Button in navbar
  - [x] Confirm modal; prevent deletion when only one project (button disabled). If deletion empties the list, recreate a default project and select it.
- [ ] Add rule panel behavior:
  - [x] When selected project has rules, render the “Add rule” card collapsed by default (`Accordion`)
  - [x] Auto‑expand when the project has no rules
  - [x] Ensure submitting a rule always targets the selected project
- [x] Rules table filters only the selected project’s rules; show empty state if none.
- [x] Per‑project enable switch in the dashboard header; label clarifies global vs project enable relationship.
- [x] Global enable indicator + toggle moved to Navbar (removed old card)

## Popup UI

- [ ] Keep existing global enable toggle and “Open dashboard” button.
- [ ] Optional: display current project name for context (read from sync storage).
- [ ] Optional: quick project switcher (small dropdown) — defer if scope creep.

## Throttling Logic Adjustments

- [ ] Replace current rules source with selected project’s rules in both `content.ts` and `inpage.ts`.
- [ ] Gate interception by `effectiveEnabled` (global AND project enabled must be true).
- [ ] Maintain existing fetch/XHR patching semantics.

## Backward Compatibility & Edge Cases

- [ ] Handle extension update path: run migration once; guard with a versioned flag (e.g., `schemaVersion`).
- [ ] If there are zero projects post‑migration (fresh install), create one default empty project and select it.
- [ ] If `currentProjectId` points to a missing project, auto‑select the first available and repair storage.
- [ ] Deleting the selected project should switch selection to another existing project (first in list).

## Optional Future Enhancements (Defer)

- [ ] Project domain affinity: store `origins: string[]` per project and auto‑suggest selection based on active tab origin.
- [ ] Import/export projects and rules as JSON.
- [ ] Reorder projects and rule ordering per project (drag‑and‑drop).

## QA & Validation

- [ ] Manual test matrix:
  - [ ] Fresh install: create project, add rules, verify throttling
  - [ ] Upgrade with existing rules: migration creates default project, rules preserved
  - [ ] Global toggle OFF: no throttling regardless of project toggle
  - [ ] Global toggle ON + project enabled: throttling applies
  - [ ] Global toggle ON + project disabled: no throttling
  - [ ] Project switching updates effective rules immediately on open pages
  - [ ] Add/delete project flows; selection behaves as expected
- [ ] Verify content/inpage reactivity: storage updates propagate and STATE messages reflect changes.

## Rollout Steps

- [ ] Implement storage schema + migration utilities
  - [x] Define types (`Project`, `AppState`)
  - [x] Add `ensureSchemaMigration()`
  - [x] Add `getState`/`setState` helpers
  - [x] Add `getEffectiveState()` helper
- [ ] Update bridge to compute and post effective state
  - [x] Bridge computes effective state via helper and posts `{ rules, enabled, projectId }`
  - [x] Fallback to legacy keys if helper fails
- [ ] Wire content/inpage to new state
- [ ] Implement dashboard navbar + project CRUD (read‑only display first, then write)
- [ ] Collapse/expand add rule panel based on rule count
- [ ] Final polish, docs, and screenshots
