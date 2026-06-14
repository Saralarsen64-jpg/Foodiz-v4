import { adaptNetlifyHandler } from "./_adapter.js";
import { handler } from "../netlify/functions/track-marketing-notification.js";

export default adaptNetlifyHandler(handler);
