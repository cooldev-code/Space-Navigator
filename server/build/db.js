import initSqlJs from "sql.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
/** Parent of `src/` or `build/` — the `server/` package root */
const serverRoot = join(__dirname, "..");
function wrapDb(db) {
    return {
        exec(sql) {
            db.exec(sql);
        },
        prepare(sql) {
            return {
                run(...params) {
                    const stmt = db.prepare(sql);
                    try {
                        if (params.length)
                            stmt.bind(params);
                        stmt.step();
                    }
                    finally {
                        stmt.free();
                    }
                },
                get(...params) {
                    const stmt = db.prepare(sql);
                    try {
                        if (params.length)
                            stmt.bind(params);
                        const has = stmt.step();
                        return has ? stmt.getAsObject() : undefined;
                    }
                    finally {
                        stmt.free();
                    }
                },
                all(...params) {
                    const stmt = db.prepare(sql);
                    const rows = [];
                    try {
                        if (params.length)
                            stmt.bind(params);
                        while (stmt.step()) {
                            rows.push(stmt.getAsObject());
                        }
                        return rows;
                    }
                    finally {
                        stmt.free();
                    }
                },
            };
        },
    };
}
export async function openDatabase() {
    const sqlJsDist = join(serverRoot, "node_modules", "sql.js", "dist");
    const SQL = await initSqlJs({
        locateFile: (file) => join(sqlJsDist, file),
    });
    const db = new SQL.Database();
    db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS spaces (
      id INTEGER PRIMARY KEY,
      site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      parent_space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_spaces_site ON spaces(site_id);
    CREATE INDEX IF NOT EXISTS idx_spaces_parent ON spaces(parent_space_id);
    CREATE TABLE IF NOT EXISTS streams (
      id INTEGER PRIMARY KEY,
      space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_streams_space ON streams(space_id);
  `);
    return wrapDb(db);
}
export function seedFromJson(db) {
    const raw = readFileSync(join(serverRoot, "seedData.json"), "utf-8");
    const data = JSON.parse(raw);
    db.exec("BEGIN");
    try {
        db.exec("DELETE FROM streams; DELETE FROM spaces; DELETE FROM sites;");
        const insertSite = db.prepare("INSERT INTO sites (id, name) VALUES (?, ?)");
        const insertSpace = db.prepare("INSERT INTO spaces (id, site_id, name, parent_space_id) VALUES (?, ?, ?, ?)");
        const insertStream = db.prepare("INSERT INTO streams (id, space_id, name) VALUES (?, ?, ?)");
        for (const site of data.sites) {
            insertSite.run(site.id, site.name);
        }
        for (const site of data.sites) {
            const spaces = data.spacesBySiteId[String(site.id)] ?? [];
            for (const s of spaces) {
                insertSpace.run(s.id, site.id, s.name, s.parentSpaceId ?? null);
                for (const st of s.streams) {
                    insertStream.run(st.id, s.id, st.name);
                }
            }
        }
        db.exec("COMMIT");
    }
    catch (e) {
        try {
            db.exec("ROLLBACK");
        }
        catch {
            /* ignore */
        }
        throw e;
    }
}
export function getNextStreamId(db) {
    const row = db
        .prepare("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM streams")
        .get();
    const v = row?.next_id;
    return typeof v === "number" ? v : 1;
}
