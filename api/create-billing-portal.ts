import { adaptNetlifyHandler } from "./_adapter";
import { handler } from "../netlify/functions/create-billing-portal";

export default adaptNetlifyHandler(handler);
