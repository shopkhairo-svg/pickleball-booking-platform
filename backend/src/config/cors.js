const localOrigins = ["http://localhost", "http://localhost:5173", "http://localhost:3000"];

export function getCorsOptions(env = process.env) {
    const origins = [env.FRONTEND_URL || "http://localhost:5173", ...(env.CORS_ORIGINS || "").split(","), ...localOrigins];
    const allowed = new Set(origins.map(value => value.trim()).filter(Boolean).map(value => {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
            throw new Error("CORS configuration must contain HTTP(S) origins, without paths or credentials.");
        }
        return url.origin;
    }));
    return {
        credentials: true,
        origin(origin, callback) {
            if (!origin || allowed.has(origin)) return callback(null, true);
            return callback(Object.assign(new Error("Tên miền này không được phép truy cập API."), { code: "CORS_ORIGIN_DENIED" }));
        }
    };
}

export function handleCorsError(error, req, res, next) {
    if (error.code !== "CORS_ORIGIN_DENIED") return next(error);
    return res.status(403).json({ success: false, code: error.code, message: error.message });
}
