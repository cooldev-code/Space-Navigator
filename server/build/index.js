import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { getNextStreamId, openDatabase, seedFromJson } from "./db.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 5050);
/** Built SPA from Vite (`npm run build` at repo root → `server/dist`) */
const clientDir = join(__dirname, "../dist");
const indexHtml = join(clientDir, "index.html");
function parseSiteId(raw) {
    if (raw === undefined || raw === null)
        return null;
    const n = Number(Array.isArray(raw) ? raw[0] : raw);
    return Number.isFinite(n) ? n : null;
}
function registerApiRoutes(app, db) {
    app.get("/api/v1/sites", (_req, res) => {
        const sites = db
            .prepare("SELECT id, name FROM sites ORDER BY id ASC")
            .all();
        res.json({ sites });
    });
    app.get("/api/v1/spaces", (req, res) => {
        const siteId = parseSiteId(req.query.siteId);
        if (siteId === null) {
            res.status(400).type("text/plain").send("Missing siteId");
            return;
        }
        const exists = db
            .prepare("SELECT 1 FROM sites WHERE id = ?")
            .get(siteId);
        if (!exists) {
            res.status(400).type("text/plain").send("Invalid siteId");
            return;
        }
        if (siteId === 3) {
            res.status(400).type("text/plain").send("Invalid siteId");
            return;
        }
        const spaceRows = db
            .prepare(`SELECT id, name, parent_space_id AS parentSpaceId
         FROM spaces WHERE site_id = ? ORDER BY id ASC`)
            .all(siteId);
        const streamRows = db
            .prepare(`SELECT s.id, s.name, s.space_id
         FROM streams s
         INNER JOIN spaces sp ON sp.id = s.space_id
         WHERE sp.site_id = ?
         ORDER BY s.id ASC`)
            .all(siteId);
        const streamsBySpace = new Map();
        for (const row of streamRows) {
            const list = streamsBySpace.get(row.space_id) ?? [];
            list.push({ id: row.id, name: row.name });
            streamsBySpace.set(row.space_id, list);
        }
        const spaces = spaceRows.map((sp) => ({
            id: sp.id,
            name: sp.name,
            parentSpaceId: sp.parentSpaceId,
            streams: streamsBySpace.get(sp.id) ?? [],
        }));
        res.json({ spaces });
    });
    app.post("/api/v1/spaces/:spaceId/streams", (req, res) => {
        const spaceId = Number(req.params.spaceId);
        if (!Number.isFinite(spaceId)) {
            res.status(400).json({ error: "Invalid space id" });
            return;
        }
        const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
        if (!name) {
            res.status(400).json({ error: "Stream name is required" });
            return;
        }
        if (name.length > 200) {
            res.status(400).json({ error: "Stream name is too long" });
            return;
        }
        const space = db
            .prepare("SELECT id, site_id FROM spaces WHERE id = ?")
            .get(spaceId);
        if (!space) {
            res.status(404).json({ error: "Space not found" });
            return;
        }
        const id = getNextStreamId(db);
        try {
            db.prepare("INSERT INTO streams (id, space_id, name) VALUES (?, ?, ?)").run(id, spaceId, name);
        }
        catch {
            res.status(500).json({ error: "Failed to create stream" });
            return;
        }
        res.status(201).json({ stream: { id, name } });
    });
    app.delete("/api/v1/streams/:streamId", (req, res) => {
        const streamId = Number(req.params.streamId);
        if (!Number.isFinite(streamId)) {
            res.status(400).json({ error: "Invalid stream id" });
            return;
        }
        const row = db
            .prepare("SELECT id FROM streams WHERE id = ?")
            .get(streamId);
        if (!row) {
            res.status(404).json({ error: "Stream not found" });
            return;
        }
        db.prepare("DELETE FROM streams WHERE id = ?").run(streamId);
        res.status(204).send();
    });
}
async function main() {
    const db = await openDatabase();
    seedFromJson(db);
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: "64kb" }));
    registerApiRoutes(app, db);
    if (existsSync(indexHtml)) {
        app.use(express.static(clientDir, { index: false }));
        app.get("*", (req, res, next) => {
            if (req.path.startsWith("/api")) {
                next();
                return;
            }
            res.sendFile(indexHtml, (err) => {
                if (err)
                    next(err);
            });
        });
    }
    app.use((req, res) => {
        if (req.path.startsWith("/api")) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        if (!existsSync(indexHtml)) {
            res
                .status(503)
                .type("text/plain")
                .send("Client not built. Run `npm run build` from the repository root.");
            return;
        }
        res.status(404).type("text/plain").send("Not found");
    });
    app.use((err, _req, res, _next) => {
        if (err &&
            typeof err === "object" &&
            "type" in err &&
            err.type === "entity.parse.failed") {
            res.status(400).json({ error: "Invalid JSON body" });
            return;
        }
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    });
    app.listen(PORT, () => {
        console.log(`Server http://127.0.0.1:${PORT}`);
        if (existsSync(indexHtml)) {
            console.log(`  SPA + API (SPA from ${clientDir})`);
        }
        else {
            console.warn("  API only — run `npm run build` at repo root to emit SPA into server/dist.");
        }
    });
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
