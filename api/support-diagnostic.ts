import { adaptNetlifyHandler } from "./_adapter.js";
import { handler } from "../netlify/functions/support-diagnostic.js";

export default adaptNetlifyHandler(handler);
