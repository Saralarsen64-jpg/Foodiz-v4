import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler } from "../netlify/functions/delete-account.js";

export default adaptNetlifyHandler(handler);
