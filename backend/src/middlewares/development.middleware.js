export function inDevelopment(req, res) {
    return res.status(501).json({ success: false, code: "FEATURE_IN_DEVELOPMENT", message: "Tính năng đang trong giai đoạn phát triển, sẽ được hoàn thiện trong phiên bản tiếp theo." });
}

// Keep historical records and implementation, but stop unfinished workflows at the API boundary.
export function developmentGate(req, res, next) {
    const path = req.path;
    const disabled = /^\/(shipper|maintenance-staff|coupons|points)(\/|$)/.test(path)
        || /^\/(admin|vendor)\/(equipments|import-orders|maintenance|maintenance-staff|shippers|deliveries)(\/|$)/.test(path)
        || /^\/vendor\/bookings\/[^/]+\/(prepare|return-equipment)\/?$/.test(path)
        || /^\/bookings\/(equipments|[^/]+\/(payment-intent|verify-payment))\/?$/.test(path);
    return disabled ? inDevelopment(req, res) : next();
}
