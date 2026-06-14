import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler } from "../netlify/functions/partner-order-action.js";

export default adaptNetlifyHandler(handler);
