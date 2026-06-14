import { adaptNetlifyHandler } from "./_adapter";
import { handler } from "../netlify/functions/stripe-webhook";

export default adaptNetlifyHandler(handler);
