import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler } from "../netlify/functions/track-marketing-notification.js";

export default adaptNetlifyHandler(handler);
