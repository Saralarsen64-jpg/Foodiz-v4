import { adaptNetlifyHandler } from "./_adapter";
import { handler } from "../netlify/functions/get-subscription";

export default adaptNetlifyHandler(handler);
