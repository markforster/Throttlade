# Testing Backlog

This doc lists the next-layer tests we want to add. Items are grouped by category; check them off as coverage lands.

## Utility Functions

- [x] `throttleWithTimeout` (src/utils/throttling.ts): assert return shape and timing behaviour with fake timers. (tests/utils/throttling.test.ts)
- [x] `throttleWithStream` (src/utils/throttling.ts): stub `chrome.webRequest` to exercise success/failure paths. (tests/utils/throttling.test.ts)
- [x] `createThrottleSession` (src/content/throttleHelpers.ts): verify `reqStart`/`reqEnd` integration and stream fallback when messaging fails. (tests/content/throttleHelpers.test.ts)
- [ ] Requests helpers (src/utils/requests/*): cover `broadcastReqs`, `setRecent`, and inflight bookkeeping.
- [ ] Storage helpers (src/utils/storage.ts): unit tests for `ensureSchemaMigration`, `repairCurrentProjectId`, `getEffectiveState` using mocked `chrome.storage.sync`.
- [ ] Logging utilities (src/utils/log/*): add tests for any string formatting or log aggregation helpers.

## Hooks

- [ ] `useProjectRules`: ensure it loads rules, responds to storage changes, and persists updates.
- [ ] `useProjectSelector` / future `useProjects`: verify selection/toggle logic against a mocked storage layer.
- [ ] `useGlobalEnabled`: cover read/update flow with stubbed storage.
- [ ] Planned hooks (`useMethodFilter`, `useRules`, `useDropdownControlled`): add tests once implemented.

## React Components

- [ ] `ProjectDropdown`: render with sample data, assert selection and toggle callbacks, and dropdown open/close behaviour.
- [ ] Modals (`AddRuleModal`, `DeleteRuleModal`, project modals): test default values, submit/cancel callbacks, and a11y labels.
- [ ] `RulesTab` subcomponents (MethodFilter UI, RulesTable once extracted): ensure empty states, filter interaction, and action buttons behave as expected.
- [ ] `RequestsTab`: mock runtime port messages to confirm inflight/recent sections update.
- [ ] `LogsTab`: same as above—verify log list renders correctly and Clear button triggers messaging.

## Background & Content Behaviour

- [ ] Message handlers (`src/background/messages.ts`): expand coverage for `THROTTLE_STREAM_PRIME` and other branches with varied payloads.
- [ ] Dashboard port wiring (`src/background/dashboardPorts.ts`): simulate a port connection and validate initial payloads plus message responses.
- [ ] Lifecycle helper (`initializeExtension` in `src/background/lifecycle.ts`): mock chrome APIs to ensure migrations/logging/reinjection run.
- [ ] Content interceptors (`src/content/fetchInterceptor.ts`, `src/content/xhrInterceptor.ts`): test that throttling sessions are created and completed, including error cases.

Keep this list up to date as new modules land or existing gaps close. When a task is finished, mark it `[x]` and note the test file path for future reference.
