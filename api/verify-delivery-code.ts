import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler } from "../netlify/functions/verify-delivery-code.js";

export default adaptNetlifyHandler(handler);
