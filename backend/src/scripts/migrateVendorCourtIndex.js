import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const uri = process.argv.find(arg => arg.startsWith("--mongo-url="))?.slice("--mongo-url=".length) || process.env.MONGO_URI;
if (!uri) throw new Error("Pass --mongo-url=<URI> or set MONGO_URI.");
await mongoose.connect(uri);
try {
    const collection = mongoose.connection.collection("courts");
    const indexes = await collection.indexes();
    const legacy = indexes.find(index => index.name === "vendorId_1" && index.unique);
    if (legacy) await collection.dropIndex(legacy.name);
    await collection.createIndex({ vendorId: 1 }, { name: "vendorId_lookup" });
    console.log(legacy ? "Replaced unique vendorId index with non-unique lookup index." : "Non-unique vendorId lookup index ensured.");
} finally {
    await mongoose.disconnect();
}
