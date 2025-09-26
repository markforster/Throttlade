# Throttlr — Snapshot v0.0.3

This snapshot captures work completed after the v0.0.2 UX pass.

## Highlights
- Rules: Edit flow using shared Add/Edit modal (prefilled fields, save in place)
- Rules: Confirm Delete modal to prevent accidental removal
- Project selector: custom Dropdown with inline toggle (combined selector + status)
- Method filter dropdown: checkbox layout refined (labels left, checkboxes right)
- Table polish: URL/Path flexible width; compact non-wrapping columns
- Visual tweaks: icon updates (PATCH uses PatchCheck, DELETE uses FileX), hover style suppression on dropdowns
- Utilities + Testing: extracted rules UI helpers and added Jest + ts-jest setup with initial tests

## Completed Items
- Edit Rule via shared modal (dynamic title/button; add vs save)
- Confirm Delete Rule modal with rule summary
- ProjectDropdown component (in-file) combining selection and toggle in one control
- Method filter dropdown layout (aligned labels/checkboxes)
- Rules table layout improvements (flex first column, nowrap others)
- Method badge icon refinement (PATCH=PatchCheck, DELETE=FileX)
- Dropdown hover/focus/active styling suppressed for cleaner look
- utils: `src/utils/rules-ui.tsx` with method variants/icons and match-mode badge classes
- Test setup: Jest + ts-jest + jsdom + basic utils tests

## Known Issues
- Project dropdown: toggling a project in the open menu can still close the menu in some cases
- Project dropdown: selecting requires clicking on text; row click should select (excluding toggle)

## Next Focus (not included in this snapshot)
- Refactor options.tsx into components/hooks (see TODO.md Refactoring)
- Advanced table features: search, grouping, view-only sorting
- Rule management: per-rule enable/disable, reorder rules (modal or drag-and-drop)

