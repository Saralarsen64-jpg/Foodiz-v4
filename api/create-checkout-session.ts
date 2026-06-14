import { adaptNetlifyHandler } from "./_adapter.js";
import { handler } from "../netlify/functions/create-checkout-session.js";

export default adaptNetlifyHandler(handler);
