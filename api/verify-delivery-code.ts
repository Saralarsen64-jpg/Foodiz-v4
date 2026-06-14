import { adaptNetlifyHandler } from "./_adapter.js";
import { handler } from "../netlify/functions/verify-delivery-code.js";

export default adaptNetlifyHandler(handler);
