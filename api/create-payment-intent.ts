import { adaptNetlifyHandler } from "./_adapter.js";
import { handler } from "../netlify/functions/create-payment-intent.js";

export default adaptNetlifyHandler(handler);
