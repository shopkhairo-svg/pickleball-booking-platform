import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cors from "cors";
import { getCorsOptions, handleCorsError } from "../src/config/cors.js";

test("custom app and Swagger origins support browser requests and preflights", async t => {
    const app = express();
    app.use(cors(getCorsOptions({
        FRONTEND_URL: " https://pickleballsytems.io.vn/ ",
        CORS_ORIGINS: "https://api.pickleballsytems.io.vn/, https://another-app.example"
    })));
    app.use(handleCorsError);
    app.get("/api/courts", (req, res) => res.json({ success: true }));
    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const origin of ["https://pickleballsytems.io.vn", "https://api.pickleballsytems.io.vn", "http://localhost", "http://localhost:5173"]) {
        const response = await fetch(`${base}/api/courts`, { headers: { Origin: origin } });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("access-control-allow-origin"), origin);
        assert.equal(response.headers.get("access-control-allow-credentials"), "true");
        assert.match(response.headers.get("vary"), /Origin/);
        const preflight = await fetch(`${base}/api/auth/login`, { method: "OPTIONS", headers: {
            Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type"
        } });
        assert.equal(preflight.status, 204);
        assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
        assert.match(preflight.headers.get("access-control-allow-methods"), /POST/);
        assert.match(preflight.headers.get("access-control-allow-headers"), /authorization/);
    }
    for (const origin of ["https://pickleballsytems.io.vn.attacker.example", "http://pickleballsytems.io.vn", "null"]) {
        const response = await fetch(`${base}/api/courts`, { headers: { Origin: origin } });
        assert.equal(response.status, 403);
        assert.equal(response.headers.get("access-control-allow-origin"), null);
        const body = await response.json();
        assert.equal(body.code, "CORS_ORIGIN_DENIED");
        assert.equal(body.stack, undefined);
    }
    assert.equal((await fetch(`${base}/api/courts`)).status, 200);
});

test("CORS settings reject wildcard origins and API paths", () => {
    for (const value of ["*", "https://api.example/api", "https://name:secret@app.example", "file:///tmp/"]) {
        assert.throws(() => getCorsOptions({ FRONTEND_URL: value }));
    }
});
