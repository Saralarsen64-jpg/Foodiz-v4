import { adaptNetlifyHandler } from "./_adapter.js";
import { handler } from "../netlify/functions/rotate-advantages.js";

export default adaptNetlifyHandler(handler);
