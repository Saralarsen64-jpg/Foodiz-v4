import { adaptNetlifyHandler } from "./_adapter.js";
import { handler } from "../netlify/functions/create-billing-portal.js";

export default adaptNetlifyHandler(handler);
