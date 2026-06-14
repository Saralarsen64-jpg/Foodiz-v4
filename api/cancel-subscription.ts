import { adaptNetlifyHandler } from "./_adapter";
import { handler } from "../netlify/functions/cancel-subscription";

export default adaptNetlifyHandler(handler);
