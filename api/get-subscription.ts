import { adaptNetlifyHandler } from "./_adapter.js";
import { handler } from "../netlify/functions/get-subscription.js";

export default adaptNetlifyHandler(handler);
