import { courtDate, queryNumber } from "./courtQuery.js";
import { searchPattern } from "./textSearch.js";
import { locationSelectionFilter, locationFreeTextFilter } from "./locationFilter.js";
export { searchPattern } from "./textSearch.js";
const badRequest = message => Object.assign(new Error(message), { status: 400 });

export function buildCourtFilters(query = {}) {
    const integer = (value, fallback, max) => queryNumber(value, { fallback, min: 1, max, integer: true });
    const limit = integer(query.limit, 6, 50);
    const page = integer(query.page, 1, 10000);
    const filter = {};
    const clauses = [];
    if (query.type !== undefined && query.type !== "") {
        if (typeof query.type !== "string" || !["INDOOR", "OUTDOOR"].includes(query.type.toUpperCase())) throw badRequest("Loại sân không hợp lệ.");
        filter.type = query.type.toUpperCase();
    }
    if (query.locationId !== undefined && query.locationId !== "") clauses.push(locationSelectionFilter(query.locationId));
    else if (query.location !== undefined && query.location !== "") clauses.push(locationFreeTextFilter(query.location));
    if (query.search !== undefined && query.search !== "") {
        const pattern = searchPattern(query.search);
        if (pattern) clauses.push({ $or: ["name", "location", "address"].map(field => ({ [field]: { $regex: pattern, $options: "i" } })) });
    }
    if (clauses.length) filter.$and = clauses;
    for (const [key, operator] of [["minPrice", "$gte"], ["maxPrice", "$lte"]]) {
        if (query[key] !== undefined && query[key] !== "") {
            const value = queryNumber(query[key], { min: 0 });
            filter.pricePerHour ??= {};
            filter.pricePerHour[operator] = value;
        }
    }
    if (filter.pricePerHour?.$gte > filter.pricePerHour?.$lte) throw badRequest("Giá tối thiểu không được lớn hơn giá tối đa.");
    const date = query.date === undefined ? undefined : courtDate(query.date);
    return { filter, limit, page, date, skip: (page - 1) * limit };
}
