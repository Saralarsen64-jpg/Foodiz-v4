import { adaptNetlifyHandler } from "./_adapter.js";
import { handler } from "../netlify/functions/create-payout.js";

export default adaptNetlifyHandler(handler);
