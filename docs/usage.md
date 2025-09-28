# Throttlade — Usage Guide

This guide walks through the Options dashboard UI, global enable, projects, tabs, and day‑to‑day rule management (add, filter, order).

- Open the dashboard from the extension’s Options, or click the toolbar popup and press “Open dashboard”.
- The dashboard has a top navbar, a project control bar, and three tabs: Rules, Requests, Logs.

## What You’ll See

- Navbar (top): a status badge (Enabled/Disabled) and a global on/off switch.
- Project bar (under navbar): Add project, Project selector with inline enable switch, Clone, and Delete.
- Tabs: Rules (manage throttling rules), Requests (live in‑flight and recent), Logs (latest events).

## Global Enable

- The global toggle controls whether any throttling occurs anywhere.
- Toggle it from the navbar or the popup. When off, no rules are applied even if projects are enabled.
- The badge shows Enabled (green) or Disabled (gray) and state persists across sessions.

## Projects

Projects let you keep separate sets of rules (e.g., Localhost, Staging, Prod).

- Select: Use the Project dropdown (top bar). Click a name to switch. The selected project’s name appears on the button.
- Enable/Disable a project: Use the switch next to the project in the dropdown, or the inline switch on the selected project’s button. Disabled projects don’t apply their rules.
- Add: Click “Add project”, name it (duplicates are prevented), then Save. The new project is enabled and selected.
- Clone: Click the Clone button to duplicate the selected project. A suggested name like name_copy is provided; a unique name is required. The clone keeps the source project’s enabled state and rules (with new IDs) and is inserted after the source. Why clone? To back up a working set, test a variation, or let QA tweak rules without losing the baseline.
- Delete: Click Delete. You’ll be asked to confirm. You can’t delete the only remaining project; if you delete down to none, a Default project is created so the app remains usable.

## Tabs Overview

- Rules: Create, view, filter, and reorder throttling rules for the selected project.
- Requests: Live view of in‑flight requests with progress plus a Recent (last 50) list.
- Logs: Rolling log of the latest 100 entries with levels; includes a Clear button.

## Rules Tab

Rules are evaluated top‑down; the first match wins. New rules are added at the top.

Header actions/search (top of the Rules tab):
- Search box: Filter rules by pattern, method (GET/POST/Any), or match mode (Regex/Wildcard). Case-insensitive; supports phrases with quotes and exclusions with a leading `-` (e.g., `-regex`).
- Manage order: Opens a drag‑and‑drop modal to reorder rules. See Ordering below.
- Filter by method: Funnel icon opens a menu with checkboxes for GET/POST/PUT/PATCH/DELETE and Clear / Select all.
- Add rule: Opens the Add/Edit modal.

Table columns:
- Order: Row index (e.g., #1, #2). Higher rows have higher priority.
- URL / Path: The pattern text. Shadowing/conflict badges appear on the right for quick guidance.
- Method: A colored badge showing the HTTP method (or Any when unspecified).
- Match Mode: Wildcard or Regex. Wildcard performs a substring match; Regex uses JavaScript RegExp.
- Delay: Throttle delay in milliseconds (ms).
- Actions: Edit and Delete buttons.

Conflict badges in the table:
- Never matches (red): A higher‑priority rule definitively blocks this one. Tooltip shows the first blocker and reason.
- May not match (yellow): Likely overlap with an earlier, broader rule. Tooltip shows the first suspected blocker and reason.
- Where shown, a “Move above blocker” quick action reorders the rule just above the first blocker.

### Adding and Editing Rules

Click Add rule (or Edit on a row) to open the modal.

Fields:
- Pattern: URL or path text used for matching. Examples: /api/users, https://api.example.com, ^https://api\\.site\\.com
- Method: GET, POST, PUT, PATCH, DELETE, or Any (blank) to apply to all methods.
- Delay (ms): Integer throttle delay. Default is 2000 ms.
- Match mode: Wildcard (substring) or Regex (JavaScript regex). Invalid regex patterns are flagged.

Live helpers in the modal:
- Shadowing alert: Shows “Never matches” or “May not match” if the draft would be blocked; identifies the first blocker and why. When editing, you can “Move above blocker” from here.
- Preview: Enter a URL and method to see which rule would match first given the current ordering. You can also toggle “Show evaluation steps” to see the ordered checks and the winner.

Saving:
- Add rule inserts the new rule at the top of the list (highest priority).
- Save rule updates the rule in place.

Deleting a rule:
- Click Delete on a row; confirm in the dialog.

### Filtering Rules

- Use the search box to filter as you type. Multiple words act as AND; wrap phrases in quotes (`"/api users"`). Add `-term` to exclude matches (e.g., `-regex`).
- Click the funnel icon to filter by one or more HTTP methods.
- Use Clear to remove filters, or Select all to quickly include common methods.
- If filters hide all rows, the table explains there are no rules matching the selected filters.

### Ordering Rules

- Click Manage order to open the drag‑and‑drop modal.
- Drag the handle to reorder; the top items have higher match priority.
- Conflict badges (“Never matches” / “May not match”) are visible per row with tooltips and a “Move above blocker” action.
- Use “Show conflicted only” to focus on rules with conflicts; totals for definite/possible conflicts are displayed.
- Click Save order to persist changes.

## Requests Tab

A live view of traffic affected by throttling.
- In‑flight: Active requests with progress bars showing elapsed vs. throttle delay. Each row shows the method badge and a truncated path.
- Recent (last 50): Recently completed requests with 100% progress and a success variant.

## Logs Tab

Observability into what the extension is doing.
- Shows the latest 100 entries with level badges (debug, info, warning, error), timestamp, message, and optional details.
- Click Clear to reset logs.

## Tips

- Specific before general: Put more specific patterns (or stricter methods) above broader ones. The analyzer highlights conflicts to help you avoid accidental shadowing.
- Global vs. Project: Both must be enabled for throttling to occur—Global enable plus the selected project’s enable.
- Testing variations: Use Clone to branch a rule set, experiment safely, and keep your baseline intact.
