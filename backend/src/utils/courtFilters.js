const accentGroups = ["aàáảãạăằắẳẵặâầấẩẫậ", "eèéẻẽẹêềếểễệ", "iìíỉĩị", "oòóỏõọôồốổỗộơờớởỡợ", "uùúủũụưừứửữự", "yỳýỷỹỵ", "dđ"];
const badRequest = message => Object.assign(new Error(message), { status: 400 });

export function searchPattern(value) {
    if (typeof value !== "string" || value.length > 120) throw badRequest("Từ khóa phải là chuỗi tối đa 120 ký tự.");
    return [...value.trim().normalize("NFC").toLowerCase()].map(char => {
        const group = accentGroups.find(group => group.includes(char));
        return group ? `[${group}]` : char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("").replace(/\s+/g, "\\s+");
}

export function buildCourtFilters(query = {}) {
    const integer = (value, fallback, max) => {
        const n = value === undefined ? fallback : Number(value);
        if (!Number.isInteger(n) || n < 1 || n > max) throw badRequest("Phân trang không hợp lệ.");
        return n;
    };
    const limit = integer(query.limit, 6, 50);
    const page = integer(query.page, 1, 10000);
    const filter = {};
    const clauses = [];
    if (query.type) {
        if (typeof query.type !== "string" || !["INDOOR", "OUTDOOR"].includes(query.type.toUpperCase())) throw badRequest("Loại sân không hợp lệ.");
        filter.type = query.type.toUpperCase();
    }
    for (const [key, fields] of [["location", ["location", "address"]], ["search", ["name", "location", "address"]]]) {
        if (query[key] !== undefined && query[key] !== "") {
            const pattern = searchPattern(query[key]);
            if (pattern) clauses.push({ $or: fields.map(field => ({ [field]: { $regex: pattern, $options: "i" } })) });
        }
    }
    if (clauses.length) filter.$and = clauses;
    for (const [key, operator] of [["minPrice", "$gte"], ["maxPrice", "$lte"]]) {
        if (query[key] !== undefined && query[key] !== "") {
            const value = Number(query[key]);
            if (typeof query[key] === "object" || !Number.isFinite(value) || value < 0) throw badRequest("Giá sân phải là số không âm.");
            filter.pricePerHour ??= {};
            filter.pricePerHour[operator] = value;
        }
    }
    if (filter.pricePerHour?.$gte > filter.pricePerHour?.$lte) throw badRequest("Giá tối thiểu không được lớn hơn giá tối đa.");
    return { filter, limit, page, skip: (page - 1) * limit };
}
