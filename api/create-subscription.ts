import { adaptNetlifyHandler } from "./_adapter.js";
import { handler } from "../netlify/functions/create-subscription.js";

export default adaptNetlifyHandler(handler);
