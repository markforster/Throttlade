# TODO

## Background Module Refactor

- [ ] Audit current responsibilities in `src/background.ts` and confirm boundaries for separate modules (ports, lifecycle, dashboard, message routing).
- [ ] Extract dashboard port wiring into `src/background/dashboardPorts.ts`; expose a `setupDashboardPorts()` initializer.
- [ ] Create `src/background/lifecycle.ts` for install/startup logic with a shared `initializeExtension()` used by both listeners.
- [ ] Move runtime message handlers into `src/background/messages.ts`, using a message-type map so each handler is isolated and testable.
- [ ] Encapsulate request tracking handlers in a helper (e.g., `handleRequestMessage`) that updates inflight/recent state and notifies dashboards.
- [ ] Update `src/background.ts` to act as a thin entrypoint that imports and registers the extracted initializers.
- [ ] Add unit tests (where practical) for the new modules, particularly message and request handler utilities.
