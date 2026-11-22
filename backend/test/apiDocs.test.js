import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import express from "express";
import SwaggerParser from "swagger-parser";
import { openapiSpec } from "../src/docs/openapi.js";
import { createApiDocsRouter } from "../src/docs/router.js";
import { developmentGate } from "../src/middlewares/development.middleware.js";

const httpMethods = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);
const normalized = value => value.replace(/:[a-zA-Z]+|\{[^}]+\}/g, "{}").replace(/\/$/, "");
const operations = Object.entries(openapiSpec.paths).flatMap(([path, item]) => Object.entries(item)
    .filter(([method]) => httpMethods.has(method)).map(([method, operation]) => ({ path, method, operation })));

async function mountedRoutes() {
    const server = await readFile(new URL("../src/server.js", import.meta.url), "utf8");
    const imports = new Map([...server.matchAll(/import\s+(\w+)\s+from\s+["']\.\/routes\/([^"']+)["']/g)].map(match => [match[1], match[2]]));
    const result = [];
    for (const mount of server.matchAll(/app\.use\(["']\/api(\/[^"']+)["'],\s*(\w+)\)/g)) {
        assert.ok(imports.has(mount[2]), `Resolve router import: ${mount[2]}`);
        const source = (await readFile(new URL(`../src/routes/${imports.get(mount[2])}`, import.meta.url), "utf8")).replace(/\/\*[\s\S]*?\*\//g, "");
        const sharedAuth = /router\.use\([^;]*\bverifyToken\b/.test(source);
        const declarations = [...source.matchAll(/router\.(get|post|put|patch|delete|head|options)\(\s*["']([^"']+)["']/g)];
        for (let i = 0; i < declarations.length; i++) {
            const entry = declarations[i];
            const body = source.slice(entry.index, declarations[i + 1]?.index ?? source.length);
            const path = (mount[1] + entry[2]).replace(/\/$/, "");
            let active = false;
            developmentGate({ path }, { status: () => ({ json: () => {} }) }, () => { active = true; });
            if (active) result.push({ method: entry[1], path, authenticated: sharedAuth || /\bverifyToken\b/.test(body) });
        }
    }
    return result;
}

test("OpenAPI validates with all references resolved and no external schema requests", async () => {
    await SwaggerParser.validate(structuredClone(openapiSpec), { resolve: { external: false } });
});

test("every active mounted Express operation is documented, with no invented or disabled operations", async () => {
    const actual = await mountedRoutes();
    assert.ok(actual.length > 70, "Route discovery should include the complete API, not just the old four comments");
    const expected = actual.map(({ method, path }) => `${method} ${normalized(path)}`).sort();
    const documented = operations.map(({ method, path }) => `${method} ${normalized(path)}`).sort();
    assert.deepEqual(documented, expected);
    assert.equal(new Set(documented).size, documented.length, "No duplicate equivalent operation templates");
    const templateKeys = Object.keys(openapiSpec.paths).map(normalized);
    assert.equal(new Set(templateKeys).size, templateKeys.length, "Equivalent path templates must use a single parameter name");
    for (const route of actual.filter(item => item.authenticated)) {
        const match = operations.find(item => item.method === route.method && normalized(item.path) === normalized(route.path));
        assert.deepEqual(match.operation.security, [{ BearerAuth: [] }], `${route.method} ${route.path} requires a JWT`);
    }
});

test("operations have functional groups, unique deep links and valid required path parameters", () => {
    const tags = new Set(openapiSpec.tags.map(tag => tag.name));
    const ids = new Set();
    for (const { path, operation } of operations) {
        assert.ok(operation.summary?.length, path);
        assert.ok(operation.tags?.length, path);
        for (const tag of operation.tags) assert.ok(tags.has(tag) && tag !== "default", `${path}: ${tag}`);
        assert.ok(operation.operationId && !ids.has(operation.operationId), path);
        ids.add(operation.operationId);
        const params = [...(openapiSpec.paths[path].parameters || []), ...(operation.parameters || [])].filter(param => param.in === "path");
        assert.deepEqual(params.map(param => param.name).sort(), [...path.matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort(), path);
        assert.ok(params.every(param => param.required), path);
    }
    assert.deepEqual(openapiSpec.servers.map(server => server.url), ["/api"]);
});

test("Swagger UI, downloadable specification and local assets are served without database access", async t => {
    const app = express();
    app.use("/api-docs", createApiDocsRouter());
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    const base = `http://127.0.0.1:${server.address().port}/api-docs`;
    const json = await fetch(`${base}/openapi.json`);
    assert.equal(json.status, 200);
    assert.match(json.headers.get("content-type"), /application\/json/);
    assert.deepEqual(await json.json(), JSON.parse(JSON.stringify(openapiSpec)));
    const ui = await fetch(`${base}/`);
    assert.equal(ui.status, 200);
    const html = await ui.text();
    assert.match(html, /PickleballPro/);
    assert.match(html, /name.?=.?.?viewport|viewport\.name/);
    const initialization = await fetch(`${base}/swagger-ui-init.js`);
    const script = await initialization.text();
    assert.match(script, /"docExpansion":\s*"none"/);
    assert.match(script, /"filter":\s*true/);
    assert.match(script, /"persistAuthorization":\s*false/);
    assert.match(script, /BearerAuth/);
    const css = await fetch(`${base}/swagger-ui.css`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get("content-type"), /text\/css/);
});
