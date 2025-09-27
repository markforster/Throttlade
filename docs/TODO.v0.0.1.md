# Throttlr Projects/Domains — v0.0.1 Completed Work

Snapshot of all completed items from the projects/domains plan.

## Goals

- [x] Add first‑class “projects” (aka domains) to group throttling rules.
- [x] Let users select, add, and delete projects in the dashboard.
- [x] Persist rules per project; newly added rules are stored under the selected project.
- [x] Throttling applies only to the selected project’s rules.
- [x] Global enable toggle disables throttling across all projects when off; when on, effective throttling also requires the selected project to be enabled (per‑project enable/disable).
- [x] Keep current UX flow (add rule, list rules), but improve structure (collapsed add form if the project already has rules).

## Data Model & Storage

- [x] Define storage schema (sync): `globalEnabled`, `projects`, `currentProjectId`.
- [x] Migration step (partial):
  - [x] Create default project from legacy `rules` (if present)
  - [x] Set `globalEnabled` from legacy `enabled` (default true)
  - [x] Set `currentProjectId` to the new project’s id
  - [x] Stamp `schemaVersion = 1`
- [x] Utilities:
  - [x] Typed `getState`/`setState`
  - [x] Idempotent `ensureSchemaMigration()`
  - [x] `getEffectiveState()` helper (selected project + effective enabled)

## Background + Bridge + Page State Flow

- [x] Compute and broadcast effective state to in‑page script (selected project’s rules + `effectiveEnabled`).
- [x] Include `projectId` in bridge payload for diagnostics.
- [x] content.ts prefers broadcast STATE over legacy storage.
- [x] inpage.ts consumes STATE rules/enabled.
- [x] Recompute on storage changes (`globalEnabled`, `projects`, `currentProjectId`, legacy keys).
- [x] Run migration + repair `currentProjectId` on install/startup, then log effective state.

## Dashboard UI (Options Page)

- [x] Navbar with current project name.
- [x] Project selector bound to `currentProjectId`.
- [x] “Add project” button and modal (name, save → create + select).
- [x] Delete project with confirm; guard against deleting the last project (auto‑create Default).
- [x] Per‑project enable indicator (Badge) and toggle (switch).
- [x] Add rule panel collapsed by default (Accordion); auto‑expand when empty.
- [x] Rules table shows only selected project’s rules.
- [x] Global enable indicator + toggle in Navbar (legacy card removed).

## Popup UI

- [x] Keep global enable toggle and “Open dashboard” button.
- [x] Write both `enabled` (legacy) and `globalEnabled` (schema) for compatibility.

## Backward Compatibility & Edge Cases

- [x] One‑time migration guarded by `schemaVersion`.
- [x] Create default project on empty state and select it.
- [x] Repair invalid/missing `currentProjectId` (persist fix to storage).
- [x] Deleting the selected project switches selection to another existing project.

## Rollout Steps

- [x] Implement storage schema + migration utilities (types, migration, helpers, effective state).
- [x] Update bridge to compute and post effective state (with fallback).
- [x] Wire content/inpage to new state.
- [x] Implement dashboard navbar + project CRUD.
- [x] Collapse/expand add rule panel based on rule count.

