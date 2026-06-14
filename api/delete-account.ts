import { adaptNetlifyHandler } from "./_adapter.js";
import { handler } from "../netlify/functions/delete-account.js";

export default adaptNetlifyHandler(handler);
