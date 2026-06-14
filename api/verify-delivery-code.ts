import { adaptNetlifyHandler } from "./_adapter";
import { handler } from "../netlify/functions/verify-delivery-code";

export default adaptNetlifyHandler(handler);
