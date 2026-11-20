import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import mongoose from "mongoose";
import Court from "../models/court.model.js";
import SubCourt from "../models/subCourt.model.js";
import { importMapCourts } from "../data/importMapCourts.js";

const { values } = parseArgs({ options: {
    "mongo-url": { type: "string" }, days: { type: "string", default: "30" }, "dry-run": { type: "boolean", default: false }
} });
if (!values["mongo-url"]) throw new Error("Specify the target database with --mongo-url.");
try {
    await mongoose.connect(values["mongo-url"], { serverSelectionTimeoutMS: 5000 });
    const options = { days: Number(values.days) };
    const preview = await importMapCourts({ ...options, dryRun: true });
    if (values["dry-run"]) console.log(JSON.stringify({ database: mongoose.connection.name, ...preview }, null, 2));
    else {
        const directory = new URL("../../.local-data/", import.meta.url);
        await mkdir(directory, { recursive: true });
        const backup = new URL(`courts-before-import-${Date.now()}.json`, directory);
        await writeFile(backup, JSON.stringify({ database: mongoose.connection.name, courts: await Court.find().lean(), subCourts: await SubCourt.find().lean() }, null, 2), { flag: "wx" });
        console.log(JSON.stringify({ database: mongoose.connection.name, backup: fileURLToPath(backup), ...await importMapCourts(options) }, null, 2));
    }
} catch (error) {
    console.error("Court import failed:", error.message);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
