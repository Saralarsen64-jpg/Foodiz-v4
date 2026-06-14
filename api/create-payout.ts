import { adaptNetlifyHandler } from "./_adapter";
import { handler } from "../netlify/functions/create-payout";

export default adaptNetlifyHandler(handler);
