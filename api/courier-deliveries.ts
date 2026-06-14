import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler } from "../netlify/functions/courier-deliveries.js";

export default adaptNetlifyHandler(handler);
