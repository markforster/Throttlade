import { registerStateSync } from "./content/stateSync";
import { patchFetch } from "./content/fetchInterceptor";
import { patchXMLHttpRequest } from "./content/xhrInterceptor";

registerStateSync();
patchFetch();
patchXMLHttpRequest();
