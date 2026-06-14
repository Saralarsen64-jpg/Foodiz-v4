import { adaptNetlifyHandler } from "./_adapter.js";
import { handler } from "../netlify/functions/cancel-subscription.js";

export default adaptNetlifyHandler(handler);
