import type { ThrottleStrategy } from "./throttling";

// Feature flag to select throttling strategy.
// NOTE: STREAM requires background permissions and wiring.
export const THROTTLE_STRATEGY: ThrottleStrategy = "TIMEOUT"; // or "STREAM"
