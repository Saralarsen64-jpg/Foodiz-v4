import { adaptNetlifyHandler } from "./_adapter";
import { handler } from "../netlify/functions/create-subscription";

export default adaptNetlifyHandler(handler);
