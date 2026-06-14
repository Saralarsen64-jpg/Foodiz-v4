import { adaptNetlifyHandler } from "./_adapter";
import { handler } from "../netlify/functions/create-checkout-session";

export default adaptNetlifyHandler(handler);
