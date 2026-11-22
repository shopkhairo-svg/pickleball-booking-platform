# API documentation

The public documentation is served at `/api-docs/`; `/api-docs/openapi.json`
exports the same OpenAPI 3 document for Postman and other clients. The relative
server URL `/api` uses the hostname serving the documentation, including localhost.

- [public.paths.js](./public.paths.js): player APIs and review/coupon administration.
- [management.paths.js](./management.paths.js): administrator and court-owner APIs.
- [openapi.js](./openapi.js): shared schemas, security, tag order and merged specification.
- [swagger-ui.js](./swagger-ui.js) / [swagger-ui.css](./swagger-ui.css): UI configuration and responsive theme.
- [router.js](./router.js): isolated documentation router; it does not connect to the database.

When changing an active route, update its request fields, response envelope and
security in the matching contract. Use one path key for equivalent templates
(for example GET and POST subcourts share `{courtId}`). The tests compare every
active method and path against the routers mounted in the server, validate the
OpenAPI document, and check that authenticated routes require BearerAuth.

```sh
cd backend
npm run test:docs
```

Shipper, maintenance, equipment/import-order and online-payment routes remain
disabled by the development gate (HTTP 501). The documentation describes that
status in its introduction and excludes them from the working API catalogue.
Adding documentation never enables an endpoint or changes its permissions.

Swagger uses its existing Try it out and Authorize controls. Tokens are not
persisted in browser storage, and validation does not send the specification to
an external Swagger service. Use a suitable test account before executing write
operations, which go to the running backend.
