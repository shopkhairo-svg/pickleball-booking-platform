import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import { DEMO_CENTER, DEMO_COURTS, DEMO_USERS, DEMO_CREDENTIALS_FILE } from "../demo/demoData.js";

class VerificationError extends Error {}
const check = (condition, message) => { if (!condition) throw new VerificationError(message); };
const sameId = (first, second) => String(first) === String(second);
const normalizeLocation = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
const { MongoClient, ObjectId } = mongoose.mongo;

function optionsFromArgs(args) {
    const options = { apiUrl: "http://localhost/api", credentialsFile: DEMO_CREDENTIALS_FILE };
    const names = { "--mongo-url": "mongoUrl", "--api-url": "apiUrl", "--credentials-file": "credentialsFile" };
    for (let index = 0; index < args.length; index += 2) {
        const name = names[args[index]];
        check(name && args[index + 1] && !args[index + 1].startsWith("--"), "Usage: node src/scripts/verifyDemoBooking.js --mongo-url mongodb://127.0.0.1:27018/pickleball_booking [--api-url http://localhost/api] [--credentials-file PATH]");
        options[name] = args[index + 1];
    }
    check(options.mongoUrl, "An explicit --mongo-url is required; the verifier never loads production environment variables.");
    let mongoUrl;
    let apiUrl;
    try { mongoUrl = new URL(options.mongoUrl); apiUrl = new URL(options.apiUrl); }
    catch { throw new VerificationError("The MongoDB and API URLs must be valid absolute URLs."); }
    const localHosts = ["localhost", "127.0.0.1", "[::1]"];
    check(mongoUrl.protocol === "mongodb:" && localHosts.includes(mongoUrl.hostname), "Demo verification is restricted to a local MongoDB instance.");
    check(/^\/[a-zA-Z0-9_-]+$/.test(mongoUrl.pathname) && !["/admin", "/local", "/config"].includes(mongoUrl.pathname), "The MongoDB URL must explicitly name the application database.");
    check(["http:", "https:"].includes(apiUrl.protocol) && localHosts.includes(apiUrl.hostname), "Demo verification is restricted to a local HTTP API.");
    check(!apiUrl.username && !apiUrl.password && !apiUrl.search && !apiUrl.hash, "The API URL must not contain credentials, a query string, or a fragment.");
    return { ...options, apiUrl: options.apiUrl.replace(/\/+$/, ""), database: mongoUrl.pathname.slice(1) };
}

async function request(apiUrl, path, { token, body, method = "GET" } = {}) {
    let response;
    try {
        response = await fetch(`${apiUrl}${path}`, {
            method,
            headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            ...(body ? { body: JSON.stringify(body) } : {}),
            signal: AbortSignal.timeout(15000)
        });
    } catch { throw new VerificationError(`The local API request ${method} ${path.split("?")[0]} did not complete.`); }
    let data;
    try { data = await response.json(); }
    catch { throw new VerificationError(`The local API returned non-JSON data for ${method} ${path.split("?")[0]} (HTTP ${response.status}).`); }
    return { status: response.status, data };
}

async function verifyDemoBooking(options) {
    const credentials = JSON.parse(await readFile(options.credentialsFile, "utf8"));
    check(Array.isArray(credentials.accounts) && credentials.accounts.length === 2 && DEMO_USERS.length === 2, "The credentials file must contain exactly the two seeded demo accounts.");
    const accounts = DEMO_USERS.map(user => {
        const account = credentials.accounts.find(item => sameId(item._id, user._id) && item.email === user.email);
        check(account && account.email.endsWith("@example.invalid") && typeof account.password === "string" && account.password.length >= 8, "Demo credentials do not match the fixed demo account IDs and emails.");
        return account;
    });
    check(DEMO_COURTS.length === 6, "The demo fixture must define six courts.");
    const courtIds = DEMO_COURTS.map(court => new ObjectId(court._id));
    const date = new Date(Date.now() + 2 * 86400000).toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
    const client = new MongoClient(options.mongoUrl, { serverSelectionTimeoutMS: 5000 });
    const sessions = [];
    let result;
    try {
        await client.connect();
        const db = client.db(options.database);
        // Native collection reads deliberately avoid model initialization/index writes.
        const courts = db.collection("courts");
        const slots = db.collection("courtslots");
        const bookings = db.collection("bookings");
        const seededCourts = await courts.find({ _id: { $in: courtIds }, status: "AVAILABLE" }, { projection: { _id: 1, name: 1 } }).toArray();
        check(seededCourts.length === 6 && seededCourts.every(court => DEMO_COURTS.some(expected => sameId(expected._id, court._id) && expected.name === court.name)), "All six matching demo courts must be seeded and available before verification.");
        for (const account of accounts) {
            const user = await db.collection("users").findOne({ _id: new ObjectId(account._id), email: account.email, role: "USER", status: "ACTIVE" }, { projection: { _id: 1 } });
            check(user, "A matching active demo USER account was not found in the selected database.");
        }
        const lane = await db.collection("subcourts").find({ courtId: courtIds[0], status: "AVAILABLE" }).sort({ name: 1, _id: 1 }).limit(1).next();
        check(lane, "The first demo court has no available lane; run the demo seed first.");
        const slot = await slots.findOne({ courtId: courtIds[0], subCourtId: lane._id, date, startTime: "18:00" });
        check(slot, "The first demo lane has no 18:00 slot two days from today; run the demo seed first.");
        const requestKeys = accounts.map(account => `demo_verify_${slot._id}_${account._id}`);
        const previous = await bookings.find({ slotId: slot._id }).toArray();
        check(previous.every(booking => accounts.some((account, index) => sameId(account._id, booking.userId) && booking.requestKey === requestKeys[index])), "This demo slot has a booking from another user or request key; refusing to alter it.");
        const alreadyCommitted = previous.filter(booking => booking.reservationState === "COMMITTED");
        check(alreadyCommitted.length <= 1, "The demo slot already has more than one committed booking.");
        if (slot.isBooked) {
            check(alreadyCommitted.length === 1 && sameId(slot.bookingId, alreadyCommitted[0]._id) && alreadyCommitted[0].status === "PENDING", "The existing slot reservation is not the verifier's pending demo booking; refusing to proceed.");
        } else {
            check(previous.length === 0 && !slot.bookingId, "The demo slot has prior or inconsistent reservation state; refusing to create another reservation.");
        }

        const nearbyQuery = new URLSearchParams({ lat: String(DEMO_CENTER.latitude), lng: String(DEMO_CENTER.longitude), radius: String(DEMO_CENTER.radius), date, limit: "50" });
        const nearby = await request(options.apiUrl, `/courts/nearby?${nearbyQuery}`);
        check(nearby.status === 200 && nearby.data.success && Array.isArray(nearby.data.courts), `Nearby search failed (HTTP ${nearby.status}).`);
        const nearbyDemo = nearby.data.courts.filter(court => courtIds.some(id => sameId(id, court._id)));
        check(nearbyDemo.length === 6 && nearbyDemo.every(court => court.distanceKm <= DEMO_CENTER.radius), "The nearby search must return all six available demo courts within five kilometres.");
        const searches = [];
        for (const location of ["thu duc", "binh duong"]) {
            const query = new URLSearchParams({ location, date, limit: "50" });
            const response = await request(options.apiUrl, `/courts?${query}`);
            check(response.status === 200 && response.data.success && Array.isArray(response.data.courts), `Court location filtering failed (HTTP ${response.status}).`);
            const matching = response.data.courts.filter(court => courtIds.some(id => sameId(id, court._id)));
            const expected = DEMO_COURTS.filter(court => normalizeLocation(`${court.location} ${court.address}`).includes(location));
            check(expected.length > 0 && matching.length === expected.length && expected.every(court => matching.some(item => sameId(court._id, item._id))), `The ${location} filter did not return exactly the matching demo courts.`);
            searches.push({ location, demoCourtCount: matching.length });
        }

        for (const account of accounts) {
            const login = await request(options.apiUrl, "/auth/login", { method: "POST", body: { email: account.email, password: account.password } });
            check(login.status === 200 && login.data.success && typeof login.data.accessToken === "string", `Demo login failed (HTTP ${login.status}).`);
            check(sameId(login.data.user?.id, account._id) && login.data.user?.role === "USER", "The API login does not match the selected demo database and account.");
            sessions.push({ account, token: login.data.accessToken });
        }
        const payload = index => ({ slotId: String(slot._id), requestKey: requestKeys[index], paymentMethod: "CASH", note: "DEMO: concurrent booking verification; payment at court." });
        // Both users submit the exact same slot concurrently through the public HTTP API.
        const responses = await Promise.all(sessions.map((session, index) => request(options.apiUrl, "/bookings", { method: "POST", token: session.token, body: payload(index) })));
        const winner = responses.findIndex(response => response.status === 201 && response.data.success);
        const loser = winner === 0 ? 1 : 0;
        check(winner >= 0 && responses.filter(response => response.status === 201 && response.data.success).length === 1, "Concurrent booking must produce exactly one successful HTTP 201 response.");
        const allowedConflictCodes = slot.isBooked ? ["SLOT_ALREADY_BOOKED", "RESERVATION_FAILED"] : ["SLOT_ALREADY_BOOKED"];
        check(responses[loser].status === 409 && allowedConflictCodes.includes(responses[loser].data.code), "The losing booking must return HTTP 409 with the expected slot conflict code.");
        const committed = await bookings.find({ slotId: slot._id, reservationState: "COMMITTED" }).toArray();
        check(committed.length === 1 && sameId(committed[0].userId, accounts[winner]._id) && sameId(committed[0]._id, responses[winner].data.bookingId), "The database must contain exactly one committed booking belonging to the HTTP winner.");
        check(committed[0].status === "PENDING" && committed[0].paymentStatus === "UNPAID", "The demo booking must remain pending and unpaid for inspection in the interface.");
        const heldSlot = await slots.findOne({ _id: slot._id });
        check(heldSlot.isBooked && sameId(heldSlot.bookingId, committed[0]._id), "The held slot must point to the winner's committed booking.");
        const detail = await request(options.apiUrl, `/courts/${courtIds[0]}?date=${date}`);
        const detailSlot = detail.data.court?.subCourtsTimeline?.flatMap(subCourt => subCourt.slots || []).find(item => sameId(item._id, slot._id));
        check(detail.status === 200 && detailSlot?.isBooked === true, "The public court detail API must show the contested slot as booked.");
        const beforeReplay = await bookings.countDocuments({ slotId: slot._id });
        const replay = await request(options.apiUrl, "/bookings", { method: "POST", token: sessions[winner].token, body: payload(winner) });
        check(replay.status === 201 && sameId(replay.data.bookingId, committed[0]._id), "Replaying the winning request must return the original booking.");
        check(await bookings.countDocuments({ slotId: slot._id }) === beforeReplay, "Replaying the winning request must not create any extra booking record.");
        result = {
            success: true,
            mode: slot.isBooked ? "verified-existing-demo-reservation" : "verified-concurrent-booking",
            date, startTime: slot.startTime, endTime: slot.endTime,
            courtId: String(courtIds[0]), courtName: DEMO_COURTS[0].name, slotId: String(slot._id),
            nearbyDemoCourts: nearbyDemo.length, radiusKm: DEMO_CENTER.radius, searches,
            responses: responses.map((response, index) => ({ email: accounts[index].email, status: response.status, ...(response.data.code ? { code: response.data.code } : {}) })),
            committedBookings: committed.length, bookingId: String(committed[0]._id), bookingStatus: committed[0].status,
            detailShowsBooked: true, replayReturnedSameBooking: true
        };
    } finally {
        const logouts = await Promise.allSettled(sessions.map(session => request(options.apiUrl, "/auth/logout", { method: "POST", token: session.token })));
        await client.close();
        if (result) result.sessionsLoggedOut = logouts.every(item => item.status === "fulfilled" && item.value.status === 200);
    }
    return result;
}

try {
    const options = optionsFromArgs(process.argv.slice(2));
    console.log(JSON.stringify(await verifyDemoBooking(options), null, 2));
} catch (error) {
    // Never print response bodies, credentials, access tokens or connection strings.
    console.error(JSON.stringify({ success: false, message: error instanceof VerificationError ? error.message : "Demo verification could not complete because of a local file or database error." }));
    process.exitCode = 1;
}
