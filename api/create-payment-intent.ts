import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler } from "../netlify/functions/create-payment-intent.js";

export default adaptNetlifyHandler(handler);
