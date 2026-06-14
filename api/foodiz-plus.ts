import { adaptNetlifyHandler } from "./_adapter.js";
import { handler } from "../netlify/functions/foodiz-plus.js";

export default adaptNetlifyHandler(handler);
