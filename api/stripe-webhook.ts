import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler } from "../netlify/functions/stripe-webhook.js";

export default adaptNetlifyHandler(handler);
