import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Court from "../src/models/court.model.js";
import courtService from "../src/services/court.service.js";
import { getLocationSuggestions } from "../src/services/locationSuggestion.service.js";

const courtData = (name, location, address, status = "AVAILABLE") => ({
    name, location, address, status, type: "INDOOR", pricePerHour: 100000
});

test("Location suggestions and selection use a disposable database", async t => {
    const dbName = `pickleball_location_test_${randomUUID().replaceAll("-", "")}`;
    await mongoose.connect(process.env.TEST_MONGO_URL || "mongodb://127.0.0.1:27018", { dbName, serverSelectionTimeoutMS: 5000 });
    t.after(async () => {
        assert.equal(mongoose.connection.name, dbName);
        assert.match(dbName, /^pickleball_location_test_[a-f0-9]{32}$/);
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });
    await Court.init();

    await t.test("An empty booking database still returns usable regional suggestions", async () => {
        const { suggestions } = await getLocationSuggestions({ q: "thu duc" });
        assert.ok(suggestions.some(item => item.locationId === "vn-v1-d-769"));
        assert.ok(suggestions.every(item => item.source === "area"));
        assert.equal((await courtService.getCourtsListing({ locationId: "vn-v1-d-769" })).pagination.totalItems, 0);
    });

    await Court.create([
        courtData("Public A", "Hồ Chí Minh", "12 Vườn Sen, Quận 7, TP.HCM"),
        courtData("Public B", "Hồ Chí Minh", "12 vườn sen, quận 7, tp.hcm"),
        courtData("Hidden duplicate", "Hồ Chí Minh", "12 Vườn Sen, Quận 7, TP.HCM", "HIDDEN"),
        courtData("Maintenance duplicate", "Hồ Chí Minh", "12 Vườn Sen, Quận 7, TP.HCM", "MAINTENANCE"),
        courtData("Hidden only", "Hồ Chí Minh", "19 Bí Mật, Quận 7, TP.HCM", "HIDDEN"),
        courtData("Maintenance only", "Hồ Chí Minh", "20 Bí Mật, Quận 7, TP.HCM", "MAINTENANCE"),
        courtData("Numeric near-match", "Hồ Chí Minh", "22 Vườn Sen, Quận 70, TP.HCM"),
        courtData("Thu Duc", "Hồ Chí Minh", "22 Đường Số 1, Thủ Đức, TP.HCM"),
        courtData("Sai Gon ward", "Hồ Chí Minh", "10 Nguyễn Huệ, Phường Sài Gòn"),
        courtData("Chau Thanh Tay Ninh", "Tây Ninh", "10 Châu Thành"),
        courtData("Chau Thanh Tien Giang", "Tiền Giang", "10 Châu Thành"),
        courtData("Long address fallback", "Khu Vườn Trúc", "x".repeat(121))
    ]);

    await t.test("Public address suggestions deduplicate case and count only available courts", async () => {
        const { suggestions } = await getLocationSuggestions({ q: "vuon sen" });
        const addresses = suggestions.filter(item => item.source === "court");
        assert.equal(addresses.length, 2);
        const shared = addresses.find(item => item.value.startsWith("12 "));
        assert.ok(shared);
        assert.equal(shared.courtCount, 2);
        assert.equal(shared.locationId, undefined);
        assert.equal((await getLocationSuggestions({ q: "bi mat" })).suggestions.length, 0);
        assert.ok((await getLocationSuggestions({ q: "vuon", limit: 1 })).suggestions.length <= 1);
    });

    await t.test("Suggestion values remain valid search input when a stored address is too long", async () => {
        const { suggestions } = await getLocationSuggestions({ q: "vuon truc" });
        const address = suggestions.find(item => item.source === "court");
        assert.equal(address?.value, "Khu Vườn Trúc");
        const result = await courtService.getCourtsListing({ location: address.value });
        assert.deepEqual(result.courts.map(item => item.name), ["Long address fallback"]);
    });

    await t.test("Selecting a district matches abbreviated addresses without numeric prefix collisions", async () => {
        const result = await courtService.getCourtsListing({ location: "Quận 7", locationId: "vn-v1-d-778" });
        assert.deepEqual(result.courts.map(item => item.name).sort(), ["Public A", "Public B"]);
        const freeText = await courtService.getCourtsListing({ location: "Q.7" });
        assert.deepEqual(freeText.courts.map(item => item.name).sort(), ["Public A", "Public B"]);
        const partial = await getLocationSuggestions({ q: "thu d" });
        assert.ok(partial.suggestions.some(item => item.source === "court" && item.value.includes("Thủ Đức")));
        assert.ok(partial.suggestions.some(item => item.locationId === "vn-v1-d-769"));
    });

    await t.test("A selected region ID supports a qualified label and enforces its parent province", async () => {
        const thuDuc = await courtService.getCourtsListing({ location: "Thành phố Thủ Đức, Thành phố Hồ Chí Minh", locationId: "vn-v1-d-769" });
        assert.deepEqual(thuDuc.courts.map(item => item.name), ["Thu Duc"]);
        const tayNinh = await courtService.getCourtsListing({ location: "Huyện Châu Thành", locationId: "vn-v1-d-708" });
        assert.deepEqual(tayNinh.courts.map(item => item.name), ["Chau Thanh Tay Ninh"]);
        const tienGiang = await courtService.getCourtsListing({ location: "Huyện Châu Thành", locationId: "vn-v1-d-821" });
        assert.deepEqual(tienGiang.courts.map(item => item.name), ["Chau Thanh Tien Giang"]);
        const saiGonWard = await courtService.getCourtsListing({ location: "Phường Sài Gòn", locationId: "vn-v2-w-26740" });
        assert.deepEqual(saiGonWard.courts.map(item => item.name), ["Sai Gon ward"]);
    });

    await t.test("A new ward is not confused with a former city or a city alias", async () => {
        await Court.create([
            courtData("New Thu Duc ward", "Hồ Chí Minh", "20 Phường Thủ Đức"),
            courtData("Abbreviated Thu Duc ward", "TPHCM", "21 P. Thủ Đức"),
            courtData("Former Thu Duc city", "Hồ Chí Minh", "22 Thành phố Thủ Đức"),
            courtData("Legacy Sai Gon city address", "Sài Gòn", "30 Đường A")
        ]);
        const thuDucWard = await courtService.getCourtsListing({ locationId: "vn-v2-w-26824" });
        assert.deepEqual(thuDucWard.courts.map(item => item.name).sort(), ["Abbreviated Thu Duc ward", "New Thu Duc ward"]);
        const saiGonWard = await courtService.getCourtsListing({ locationId: "vn-v2-w-26740" });
        assert.deepEqual(saiGonWard.courts.map(item => item.name), ["Sai Gon ward"]);
    });

    await t.test("Regex-like text remains literal and structured parameters cannot become query operators", async () => {
        assert.deepEqual((await getLocationSuggestions({ q: ".*" })).suggestions, []);
        assert.deepEqual((await getLocationSuggestions({ q: "vuon.*" })).suggestions.filter(item => item.source === "court"), []);
        assert.deepEqual((await courtService.getCourtsListing({ location: "vuon.*" })).courts, []);
        await assert.rejects(() => getLocationSuggestions({ q: { $ne: null } }), { status: 400 });
        await assert.rejects(() => getLocationSuggestions({ q: ["vuon sen", ".*"] }), { status: 400 });
        for (const locationId of ["vn-v1-d-missing", { $ne: null }, ["vn-v1-d-778"]]) {
            await assert.rejects(() => courtService.getCourtsListing({ locationId }), { status: 400 });
        }
    });
});
