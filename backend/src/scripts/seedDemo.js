import { parseArgs } from "node:util";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import mongoose from "mongoose";
import { DEMO_CREDENTIALS_FILE, DEMO_USERS } from "../demo/demoData.js";
import { seedDemoData } from "../demo/seedDemoData.js";

const { values } = parseArgs({ options: { "mongo-url": { type: "string" }, days: { type: "string", default: "30" } } });
if (!values["mongo-url"]) throw new Error("Specify the intended database: npm run seed:demo -- --mongo-url mongodb://127.0.0.1:27018/pickleball_booking");

try {
    await mongoose.connect(values["mongo-url"], { serverSelectionTimeoutMS: 5000 });
    let credentials;
    try {
        credentials = JSON.parse(await readFile(DEMO_CREDENTIALS_FILE, "utf8"));
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
        credentials = { version: 1, accounts: DEMO_USERS.map(account => ({ ...account, password: randomBytes(18).toString("base64url") })) };
        // Keep recoverable login credentials local and outside version control.
        await writeFile(DEMO_CREDENTIALS_FILE, `${JSON.stringify(credentials, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    }
    const summary = await seedDemoData({ accounts: credentials.accounts, days: Number(values.days) });
    console.log(JSON.stringify({ database: mongoose.connection.name, ...summary, credentialsFile: DEMO_CREDENTIALS_FILE }, null, 2));
} catch (error) {
    // Do not print a connection URI or any generated passwords.
    console.error("Demo seed failed:", error.name, error.code || "", /credentials|reserved|Demo|demo/.test(error.message) ? error.message : "Check database connectivity and data constraints.");
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
