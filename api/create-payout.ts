import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler } from "../netlify/functions/create-payout.js";

export default adaptNetlifyHandler(handler);
