import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler } from "../netlify/functions/rotate-advantages.js";

export default adaptNetlifyHandler(handler);
