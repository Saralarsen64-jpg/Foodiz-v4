import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler } from "../netlify/functions/financial-document.js";

export default adaptNetlifyHandler(handler);
