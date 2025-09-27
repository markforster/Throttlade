import { registerDashboardPorts } from "./background/dashboardPorts";
import { registerLifecycleHandlers } from "./background/lifecycle";
import { registerMessageHandlers, messageHandlers } from "./background/messages";

registerDashboardPorts();
registerLifecycleHandlers();
registerMessageHandlers();

export { messageHandlers };
