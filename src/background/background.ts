import { registerDashboardPorts } from "./dashboardPorts";
import { registerLifecycleHandlers } from "./lifecycle";
import { registerMessageHandlers, messageHandlers } from "./messages";

registerDashboardPorts();
registerLifecycleHandlers();
registerMessageHandlers();

export { messageHandlers };
