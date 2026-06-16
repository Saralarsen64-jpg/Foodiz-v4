import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler } from "../netlify/functions/cancel-subscription.js";

export default adaptNetlifyHandler(handler);
