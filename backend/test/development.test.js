import test, { mock } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { developmentGate } from "../src/middlewares/development.middleware.js";

let businessCalls = 0;
let uploadCalls = 0;
let authCalls = 0;
let adminCalls = 0;
const pass = (req, res, next) => next();
const controller = new Proxy({}, { get: () => (req, res) => {
    businessCalls++;
    res.json({ success: true });
} });
for (const name of ["admin", "vendor", "booking", "coupon", "points"]) {
    mock.module(`../src/controllers/${name}.controller.js`, { defaultExport: controller });
}
mock.module("../src/middlewares/auth.middleware.js", {
    namedExports: {
        // These doubles verify route protection without importing JWT/Redis services.
        verifyToken(req, res, next) {
            authCalls++;
            const authorization = req.get("authorization");
            if (!["Bearer test-user", "Bearer test-admin"].includes(authorization)) return res.sendStatus(401);
            req.user = { role: authorization === "Bearer test-admin" ? "ADMIN" : "USER" };
            next();
        },
        requireAdmin(req, res, next) {
            adminCalls++;
            if (req.user?.role !== "ADMIN") return res.sendStatus(403);
            next();
        },
        requireVendor: pass,
    },
});
mock.module("../src/middlewares/rateLimiter.middleware.js", { namedExports: { globalLimiter: pass } });
const upload = {
    array: () => (req, res, next) => { uploadCalls++; next(); },
    single: () => (req, res, next) => { uploadCalls++; next(); },
};
const uploadCourtImages = (req, res, next) => { uploadCalls++; next(); };
mock.module("../src/config/cloudinary.js", { namedExports: { uploadCourtCloud: upload, uploadCourtImages } });

const routers = {};
for (const [prefix, module] of Object.entries({
    shipper: "shipper", "maintenance-staff": "maintenanceStaff", coupons: "coupon",
    points: "points", admin: "admin", vendor: "vendor", bookings: "booking",
})) routers[prefix] = (await import(`../src/routes/${module}.routes.js`)).default;

async function serve(t, gate) {
    const app = express();
    if (gate) app.use("/api", developmentGate);
    for (const [prefix, router] of Object.entries(routers)) app.use(`/api/${prefix}`, router);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    return `http://127.0.0.1:${server.address().port}`;
}

test("Inactive routers reject every method without business controllers or uploads, even without the global gate", async t => {
    const base = await serve(t, false);
    const paths = [
        "/shipper", "/ShIpPeR/deliveries/x/status/", "/maintenance-staff/maintenance/x/progress",
        "/ADMIN/equipments/x", "/admin/import-orders/x/cancel",
        "/admin/maintenance", "/admin/analytics/equipment-stats", "/vendor/deliveries/x/confirm-completed",
        "/vendor/shippers", "/vendor/maintenance-staff", "/vendor/maintenance/x/assign-staff",
        "/vendor/import-orders/x/assign-shipper", "/vendor/equipments/x/rentals",
        "/vendor/bookings/x/prepare", "/vendor/bookings/one%2Ftwo/return-equipment",
        "/bookings/x/payment-intent", "/bookings/x/verify-payment", "/bookings/equipments",
    ];
    businessCalls = 0; uploadCalls = 0;
    for (const path of paths) for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]) {
        const response = await fetch(`${base}/api${path}`, { method });
        assert.equal(response.status, 501, `${method} ${path}`);
        if (method !== "HEAD") assert.equal((await response.json()).code, "FEATURE_IN_DEVELOPMENT");
    }
    assert.equal(businessCalls, 0);
    assert.equal(uploadCalls, 0);
});

test("Global gate blocks encoded, mixed case, repeated separator and nested aliases", async t => {
    const base = await serve(t, true);
    for (const path of [
        "/%73hipper/deliveries", "/SHIppER/deliveries?status=COMPLETED", "/%6daintenance-staff/maintenance",
        "/admin/%65quipments", "/ADMIN//maintenance/", "/vendor/%73hippers/",
        "/vendor/bookings/x/%70repare", "/bookings/x/%76erify-payment", "/bookings/x/payment-intent/extra",
        "/admin/analytics/%65quipment-stats",
    ]) {
        const response = await fetch(`${base}/api${path}`, { method: "POST" });
        assert.equal(response.status, 501, path);
        assert.equal((await response.json()).code, "FEATURE_IN_DEVELOPMENT");
    }
});

test("Core routes continue to their controllers and malformed booking IDs fail validation", async t => {
    const base = await serve(t, true);
    const headers = { authorization: "Bearer test-admin" };
    for (const path of ["/admin/courts", "/admin/bookings", "/admin/analytics/dashboard", "/vendor/courts", "/vendor/bookings", "/vendor/reviews", "/bookings/my-bookings"]) {
        const response = await fetch(`${base}/api${path}`, { headers });
        assert.equal(response.status, 200, path);
    }
    const response = await fetch(`${base}/api/bookings/not-an-object-id/cancel`, { method: "PUT", headers });
    assert.equal(response.status, 400);
});

test("Enabled coupons and points require authentication, and coupon management requires ADMIN", async t => {
    const base = await serve(t, true);
    const endpoints = [
        { method: "GET", path: "/coupons/available" },
        { method: "POST", path: "/coupons/validate" },
        { method: "GET", path: "/points/wallet" },
        { method: "GET", path: "/coupons/admin", admin: true },
        { method: "POST", path: "/coupons/admin", admin: true },
        { method: "PUT", path: "/coupons/admin/507f1f77bcf86cd799439011", admin: true },
        { method: "DELETE", path: "/coupons/admin/507f1f77bcf86cd799439011", admin: true },
    ];
    for (const endpoint of endpoints) {
        for (const role of [null, "user", "admin"]) {
            businessCalls = 0; authCalls = 0; adminCalls = 0; uploadCalls = 0;
            const headers = role ? { authorization: `Bearer test-${role}` } : {};
            const response = await fetch(`${base}/api${endpoint.path}`, { method: endpoint.method, headers });
            const expectedStatus = !role ? 401 : endpoint.admin && role !== "admin" ? 403 : 200;
            const label = `${endpoint.method} ${endpoint.path} as ${role || "anonymous"}`;
            assert.equal(response.status, expectedStatus, label);
            assert.equal(authCalls, 1, `${label}: authentication middleware`);
            assert.equal(adminCalls, role && endpoint.admin ? 1 : 0, `${label}: admin middleware`);
            assert.equal(businessCalls, expectedStatus === 200 ? 1 : 0, `${label}: controller access`);
            assert.equal(uploadCalls, 0, `${label}: no uploads`);
            if (expectedStatus === 200) assert.equal((await response.json()).success, true, label);
        }
    }
});
