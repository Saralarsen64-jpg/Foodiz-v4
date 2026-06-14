import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler } from "../netlify/functions/foodiz-plus.js";

export default adaptNetlifyHandler(handler);
