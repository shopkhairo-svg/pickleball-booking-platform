import { createHash } from "node:crypto";
import Court from "../models/court.model.js";
import { queryNumber } from "../utils/courtQuery.js";
import { locationTextPattern } from "../utils/locationFilter.js";
import { searchLocationAreas } from "../utils/locationCatalogue.js";

export function parseLocationQuery({ q = "", limit } = {}) {
    if (typeof q !== "string" || q.length > 120) {
        throw Object.assign(new Error("Địa điểm tìm kiếm phải là chuỗi tối đa 120 ký tự."), { status: 400 });
    }
    return { q: q.trim(), limit: queryNumber(limit, { fallback: 8, min: 1, max: 15, integer: true }) };
}

export async function getLocationSuggestions(query) {
    const { q, limit } = parseLocationQuery(query);
    const pattern = q ? locationTextPattern(q) : "";
    const matches = field => ({ $regexMatch: { input: { $ifNull: [field, ""] }, regex: pattern, options: "i" } });
    const address = { $trim: { input: { $ifNull: ["$address", ""] } } };
    const location = { $trim: { input: { $ifNull: ["$location", ""] } } };
    const validAddress = { $and: [{ $gt: [{ $strLenCP: address }, 0] }, { $lte: [{ $strLenCP: address }, 120] }, ...(pattern ? [matches("$address")] : [])] };
    // Return a bounded list of unique public addresses, never hidden or maintenance courts.
    const addresses = await Court.aggregate([
        { $match: { status: "AVAILABLE", ...(pattern ? { $or: ["location", "address"].map(field => ({ [field]: { $regex: pattern, $options: "i" } })) } : {}) } },
        { $project: { value: { $cond: [validAddress, address, location] } } },
        { $match: { value: { $ne: "" }, $expr: { $lte: [{ $strLenCP: "$value" }, 120] } } },
        { $group: { _id: "$value", courtCount: { $sum: 1 } } },
        { $sort: { courtCount: -1, _id: 1 } },
        { $limit: limit }
    ]).collation({ locale: "vi", strength: 1 }).option({ maxTimeMS: 2000 });

    const courtSuggestions = addresses.map(({ _id: value, courtCount }) => ({
        id: `court-location-${createHash("sha256").update(value).digest("hex").slice(0, 20)}`,
        label: value,
        value,
        description: `${courtCount} cụm sân trong hệ thống`,
        source: "court",
        courtCount
    }));
    const areas = searchLocationAreas(q, limit);
    // Reserve room for administrative areas even when many courts share a search term.
    const firstCourts = courtSuggestions.slice(0, areas.length ? Math.min(3, Math.floor(limit / 2)) : limit);
    return { suggestions: [...firstCourts, ...areas, ...courtSuggestions.slice(firstCourts.length)].slice(0, limit) };
}
