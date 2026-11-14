import { readFileSync } from "node:fs";
import { searchPattern } from "./textSearch.js";

const { areas } = JSON.parse(readFileSync(new URL("../data/vietnam-locations.json", import.meta.url), "utf8"));
const areasById = new Map(areas.map(area => [area.id, area]));
const leftBoundary = "(?:^|[^0-9A-Za-zÀ-ỹ])";
const rightBoundary = "(?=$|[^0-9A-Za-zÀ-ỹ])";
const badRequest = message => Object.assign(new Error(message), { status: 400 });

export function normalizeLocationText(value) {
    if (typeof value !== "string") throw badRequest("Khu vực tìm kiếm không hợp lệ.");
    let normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim();
    // Sai Gon is also an actual ward name. Only the standalone/city alias
    // expands to HCM; "Phuong Sai Gon" retains its administrative identity.
    if (/^(?:(?:thanh\s+pho|tp)[\s.]+)?(?:sai\s*gon|sg)$/.test(normalized)) normalized = "ho chi minh";
    return normalized
        .replace(/\b(?:tp[\s.]*h[\s.]*c[\s.]*m|h[\s.]*c[\s.]*m)\b/g, "ho chi minh")
        .replace(/\b(?:tp[\s.]*hn|hn)\b/g, "ha noi")
        .replace(/\btp[\s.]+/g, "thanh pho ")
        .replace(/\bq[\s.]*(?=\d)/g, "quan ")
        .replace(/\bq[\s.]+/g, "quan ")
        .replace(/\bp[\s.]*(?=\d)/g, "phuong ")
        .replace(/\bp[\s.]+/g, "phuong ")
        .replace(/\b(quan|phuong)(?=\d)/g, "$1 ")
        .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function phrasePattern(text) {
    return searchPattern(text).replaceAll("\\s+", "[\\s,./-]+");
}

export function locationTextPattern(value, { exact = false } = {}) {
    // Validate raw input before normalization, and never interpret user input as regex.
    const escaped = searchPattern(value);
    // Keep deliberate regex punctuation literal rather than deleting it and
    // accidentally broadening e.g. "vuon.*" into a search for every "vuon".
    if (/[*+?^${}()|[\]\\]/.test(value)) return escaped;
    const normalized = normalizeLocationText(value);
    if (!normalized) return escaped;
    const prefix = normalized.match(/^(thanh pho|thi xa|quan|huyen|phuong|xa|tinh)\s+(.+)$/);
    const body = prefix ? prefix[2] : normalized;
    const cityContext = !prefix || ["thanh pho", "tinh"].includes(prefix[1]);
    let pattern;
    let requiresEnd = exact;
    if (cityContext && body === "ho chi minh") {
        requiresEnd = true;
        pattern = `(?:${phrasePattern(body)}|(?:tp[\\s.]*)?h[\\s.]*c[\\s.]*m|${phrasePattern("sai gon")}|saigon|sg)`;
    } else if (cityContext && body === "ha noi") {
        requiresEnd = true;
        pattern = `(?:${phrasePattern(body)}|(?:tp[\\s.]*)?hn)`;
    } else if (prefix && /^\d+$/.test(body)) {
        requiresEnd = true;
        const abbreviations = { quan: "q", phuong: "p", huyen: "h", xa: "x" };
        const prefixPattern = abbreviations[prefix[1]] ? `(?:${phrasePattern(prefix[1])}|${abbreviations[prefix[1]]}\\.?)` : phrasePattern(prefix[1]);
        pattern = `${prefixPattern}[\\s.]*0*${body.replace(/^0+(?=\d)/, "")}`;
    } else {
        // Named administrative units commonly appear without their prefix in addresses.
        pattern = phrasePattern(body);
    }
    return `${leftBoundary}${pattern}${requiresEnd ? rightBoundary : ""}`;
}

const fieldsClause = pattern => ({ $or: ["location", "address"].map(field => ({ [field]: { $regex: pattern, $options: "i" } })) });

function wardSelectionPattern(name) {
    const normalized = normalizeLocationText(name);
    const parts = normalized.match(/^(phuong|xa|dac khu)\s+(.+)$/);
    if (!parts) return locationTextPattern(name, { exact: true });
    const [, kind, body] = parts;
    const abbreviation = { phuong: "p", xa: "x" }[kind];
    const prefix = abbreviation ? `(?:${phrasePattern(kind)}|${abbreviation}\\.?)` : phrasePattern(kind);
    const place = /^\d+$/.test(body) ? `0*${body.replace(/^0+(?=\d)/, "")}` : phrasePattern(body);
    // A new ward may share its name with a former city/district (Thu Duc,
    // Binh Thanh) or a whole-city alias (Sai Gon). Require the ward qualifier
    // rather than silently treating those different geographic areas as equal.
    return `${leftBoundary}${prefix}[\\s.]*${place}${rightBoundary}`;
}

export function locationSelectionFilter(locationId) {
    if (typeof locationId !== "string" || locationId.length > 40) throw badRequest("Mã khu vực không hợp lệ.");
    const area = areasById.get(locationId);
    if (!area) throw badRequest("Khu vực đã chọn không tồn tại. Vui lòng chọn lại từ gợi ý.");
    const selected = fieldsClause(area.kind === "ward" ? wardSelectionPattern(area.name) : locationTextPattern(area.name, { exact: true }));
    if (!area.province || area.kind === "province") return selected;
    // Area and province may be stored in different fields. A qualified label must
    // not be used as one substring, and equal area names in other provinces differ.
    return { $and: [selected, fieldsClause(locationTextPattern(area.province, { exact: true }))] };
}

export function locationFreeTextFilter(value) {
    searchPattern(value);
    const parts = value.split(/[,;]/).map(part => part.trim()).filter(Boolean);
    if (!parts.length) return fieldsClause(locationTextPattern(value));
    return { $and: parts.map(part => fieldsClause(locationTextPattern(part))) };
}
