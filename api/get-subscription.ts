import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler } from "../netlify/functions/get-subscription.js";

export default adaptNetlifyHandler(handler);
