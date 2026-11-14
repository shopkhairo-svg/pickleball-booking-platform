import { readFileSync } from "node:fs";
import { normalizeLocationText } from "./locationFilter.js";

const catalogue = JSON.parse(readFileSync(new URL("../data/vietnam-locations.json", import.meta.url), "utf8"));
export const locationAreas = catalogue.areas;
const shortName = name => name.replace(/^(thanh pho|tinh|quan|huyen|phuong|xa|thi xa|thi tran|dac khu)\s+/, "");
const popularProvinces = ["vn-v2-p-79", "vn-v2-p-01", "vn-v2-p-48", "vn-v2-p-92", "vn-v2-p-46", "vn-v2-p-31"];
const indexedAreas = locationAreas.map(area => {
    const name = normalizeLocationText(area.name);
    return { area, name, short: shortName(name), text: `${name} ${normalizeLocationText(area.province)}` };
});

function suggestion(area) {
    const kind = area.kind === "province" ? "Tỉnh/thành phố" : area.kind === "district" ? "Quận/huyện" : "Phường/xã";
    return {
        id: area.id,
        locationId: area.id,
        label: area.province ? `${area.name}, ${area.province}` : area.name,
        value: area.name,
        description: `${kind}${area.legacy ? " theo địa chỉ cũ" : ""} · Việt Nam`,
        source: "area"
    };
}

// Keep this local: suggestions do not depend on an external maps service or API key.
export function searchLocationAreas(query, limit = 8) {
    if (/[$^*+?()[\]{}|\\]/.test(query)) return [];
    const normalized = normalizeLocationText(query);
    if (!normalized) return query.trim() ? [] : popularProvinces.map(id => locationAreas.find(area => area.id === id)).filter(Boolean).slice(0, limit).map(suggestion);
    const tokens = normalized.split(" ").filter(Boolean);
    return indexedAreas.map(entry => {
        const words = entry.text.split(" ");
        const matches = tokens.every((token, index) => index < tokens.length - 1 || /^\d+$/.test(token)
            ? words.includes(token)
            : words.some(word => word.startsWith(token)));
        if (!matches) return null;
        const exact = entry.name === normalized || entry.short === normalized;
        const prefix = entry.name.startsWith(normalized) || entry.short.startsWith(normalized);
        const rank = (exact ? 100 : prefix ? 60 : 20) + (entry.area.kind === "province" ? 15 : entry.area.kind === "district" ? 10 : 0);
        return { area: entry.area, rank };
    }).filter(Boolean)
        .sort((a, b) => b.rank - a.rank || Number(a.area.legacy) - Number(b.area.legacy) || a.area.name.localeCompare(b.area.name, "vi") || a.area.id.localeCompare(b.area.id))
        .slice(0, limit).map(({ area }) => suggestion(area));
}
