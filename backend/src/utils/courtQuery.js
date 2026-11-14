const badRequest = message => Object.assign(new Error(message), { status: 400 });

export function queryNumber(value, { fallback, min = -Infinity, max = Infinity, integer = false } = {}) {
    if (value === undefined && fallback !== undefined) return fallback;
    if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") throw badRequest("Tham số số không hợp lệ.");
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max || (integer && !Number.isSafeInteger(parsed))) throw badRequest("Tham số số nằm ngoài phạm vi cho phép.");
    return parsed;
}

export function vietnamDate(now = new Date()) {
    return now.toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
}

export function courtDate(value, fallback) {
    const date = value === undefined ? fallback : value;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw badRequest("Ngày tìm sân không hợp lệ.");
    return date;
}

export function futureSlotFilter(date, now = new Date()) {
    const today = vietnamDate(now);
    if (date < today) return null;
    const filter = { date, isBooked: false };
    if (date === today) {
        const time = now.toLocaleTimeString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", hour12: false });
        // HH:mm is less than HH:mm:ss in the same minute: starting now is already too late.
        filter.startTime = { $gt: time };
    }
    return filter;
}
