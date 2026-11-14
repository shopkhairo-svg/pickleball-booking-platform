import test, { mock } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { developmentGate } from "../src/middlewares/development.middleware.js";

let businessCalls = 0;
let uploadCalls = 0;
const pass = (req, res, next) => next();
const controller = new Proxy({}, { get: () => (req, res) => {
    businessCalls++;
    res.json({ success: true });
} });
for (const name of ["admin", "vendor", "booking"]) {
    mock.module(`../src/controllers/${name}.controller.js`, { defaultExport: controller });
}
mock.module("../src/middlewares/auth.middleware.js", {
    namedExports: { verifyToken: pass, requireAdmin: pass, requireVendor: pass },
});
mock.module("../src/middlewares/rateLimiter.middleware.js", { namedExports: { globalLimiter: pass } });
const upload = {
    array: () => (req, res, next) => { uploadCalls++; next(); },
    single: () => (req, res, next) => { uploadCalls++; next(); },
};
mock.module("../src/config/cloudinary.js", { namedExports: { uploadCourtCloud: upload } });

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
        "/coupons/admin/x", "/points/wallet", "/ADMIN/equipments/x", "/admin/import-orders/x/cancel",
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
        "/admin/analytics/%65quipment-stats", "/%63oupons/validate", "/%70oints/wallet",
    ]) {
        const response = await fetch(`${base}/api${path}`, { method: "POST" });
        assert.equal(response.status, 501, path);
        assert.equal((await response.json()).code, "FEATURE_IN_DEVELOPMENT");
    }
});

test("Core routes continue to their controllers and malformed booking IDs fail validation", async t => {
    const base = await serve(t, true);
    for (const path of ["/admin/courts", "/admin/bookings", "/admin/analytics/dashboard", "/vendor/courts", "/vendor/bookings", "/vendor/reviews", "/bookings/my-bookings"]) {
        const response = await fetch(`${base}/api${path}`);
        assert.equal(response.status, 200, path);
    }
    const response = await fetch(`${base}/api/bookings/not-an-object-id/cancel`, { method: "PUT" });
    assert.equal(response.status, 400);
});
