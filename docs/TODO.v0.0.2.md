# Throttlrade — UX Improvements v0.0.2 (Snapshot)

This snapshot captures the UX work completed in this pass.

## Navigation

- [x] Sticky global Navbar (brand + global enable)
- [x] Sticky project sub‑navbar under main header
- [x] Project controls grouped into a single sub‑navbar with left/right sections
  - Left: compact project selector (🟢/🔴 status indicator, status‑colored border) + Add project
  - Right: project status badge + enable switch + Delete project

## Rules Management

- [x] Replaced Add Rule accordion with a shared modal
  - [x] Modal supports Add and Edit modes (dynamic title and button text)
  - [x] Edit pre‑fills form and saves rule in place
- [x] Rules filtering by HTTP method
  - [x] Dropdown with multi‑select checkboxes; Clear / Select all
  - [x] Applied filtering to the table with informative empty states
- [x] Rules table layout
  - [x] Columns: URL/Path (flex), Method, Match Mode, Delay, Actions
  - [x] URL/Path expands; all other columns compact and non‑wrapping
- [x] Badges and icons
  - [x] Method badges: color‑coded (GET/POST/PUT/PATCH/DELETE) with method‑specific icons
    - GET=Download, POST=Upload, PUT=ArrowRepeat, PATCH=PatchCheck, DELETE=FileX
  - [x] Match Mode badges outlined with icons (Wildcard=Asterisk, Regex=BracesAsterisk)
- [x] Actions
  - [x] Icon‑only Edit/Delete buttons with visually‑hidden labels for a11y

## Help & A11y

- [x] Help tooltip next to “Current rules” explaining ordering
- [x] Added aria‑labels and titles for icon buttons and toggles

## Notes

- All changes preserve existing storage and throttling behavior.
- Future ideas (not included here): persist filters per project; custom project dropdown with inline status/toggle.

## Known Issues (at this snapshot)

- Project dropdown: toggling a project's enable switch inside the menu may close the dropdown; expected to stay open. Row selection also requires clicking directly on text rather than the whole row.
