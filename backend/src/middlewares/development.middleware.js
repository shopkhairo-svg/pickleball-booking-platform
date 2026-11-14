export function inDevelopment(req, res) {
    return res.status(501).json({ success: false, code: "FEATURE_IN_DEVELOPMENT", message: "Tính năng đang trong giai đoạn phát triển, sẽ được hoàn thiện trong phiên bản tiếp theo." });
}

// Keep historical records and implementation, but stop unfinished workflows at the API boundary.
export function developmentGate(req, res, next) {
    // Match Express's case-insensitive routing and encoded URL aliases.
    const path = req.path.split("/").map(segment => {
        try { return decodeURIComponent(segment); } catch { return segment; }
    }).join("/").replace(/\/{2,}/g, "/").toLowerCase();
    const disabled = /^\/(shipper|maintenance-staff|coupons|points)(\/|$)/.test(path)
        || /^\/(admin|vendor)\/(equipments|import-orders|maintenance|maintenance-staff|shippers|deliveries)(\/|$)/.test(path)
        || /^\/admin\/analytics\/equipment-stats(\/|$)/.test(path)
        || /^\/vendor\/bookings\/[^/]+\/(prepare|return-equipment)(\/|$)/.test(path)
        || /^\/bookings\/(equipments|[^/]+\/(payment-intent|verify-payment))(\/|$)/.test(path);
    return disabled ? inDevelopment(req, res) : next();
}
