import { adaptNetlifyHandler } from "./_adapter.js";
import { handler } from "../netlify/functions/stripe-webhook.js";

export default adaptNetlifyHandler(handler);
