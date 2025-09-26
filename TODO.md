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

## QA & Validation

- [ ] Fresh install: create project, add rules, verify throttling
- [ ] Upgrade with existing rules: migration creates default project, rules preserved
- [ ] Global toggle OFF: no throttling regardless of project toggle
- [ ] Global toggle ON + project enabled: throttling applies
- [ ] Global toggle ON + project disabled: no throttling
- [ ] Project switching updates effective rules immediately on open pages
- [ ] Add/delete project flows; selection behaves as expected
- [ ] Verify content/inpage reactivity: storage updates propagate and STATE messages reflect changes

## Rollout Steps

- [ ] Final polish, docs, and screenshots
