import { adaptNetlifyHandler } from "./_adapter";
import { handler } from "../netlify/functions/create-payment-intent";

export default adaptNetlifyHandler(handler);
