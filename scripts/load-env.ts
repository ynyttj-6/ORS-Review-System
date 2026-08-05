import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true, quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: false, quiet: true });
