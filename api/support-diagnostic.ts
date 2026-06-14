import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler } from "../netlify/functions/support-diagnostic.js";

export default adaptNetlifyHandler(handler);
