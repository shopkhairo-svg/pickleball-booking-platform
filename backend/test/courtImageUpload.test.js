import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import path from "node:path";

process.env.COURT_IMAGE_STORAGE = "local";
const { uploadCourtImages } = await import("../src/config/cloudinary.js");
const uploadService = (await import("../src/services/upload.service.js")).default;

test("court image local storage serves uploaded images and removes them", async t => {
    let saved;
    const app = express();
    app.use("/uploads", express.static(path.resolve("uploads")));
    app.post("/upload", uploadCourtImages, (req, res) => {
        saved = req.files[0];
        res.status(201).json({ imageUrl: saved.path, publicId: saved.filename });
    });
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));

    const body = new FormData();
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=", "base64");
    body.append("images", new Blob([png], { type: "image/png" }), "court.png");
    const response = await fetch(`http://127.0.0.1:${server.address().port}/upload`, { method: "POST", body });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.match(result.imageUrl, /^\/uploads\/courts\//);
    assert.match(result.publicId, /^local:courts\//);

    const imageResponse = await fetch(`http://127.0.0.1:${server.address().port}${result.imageUrl}`);
    assert.equal(imageResponse.status, 200);
    assert.equal(Buffer.from(await imageResponse.arrayBuffer()).byteLength, png.length);
    await uploadService.deleteFile(result.publicId);
});
