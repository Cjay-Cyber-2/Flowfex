import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DEFAULT_DATABASE_PATH = path.resolve(process.cwd(), '.flowfex', 'state', 'flowfex-state.sqlite');

export class SQLiteSessionStateRepository {
  constructor(config = {}) {
    this.databasePath = config.databasePath || DEFAULT_DATABASE_PATH;
    this.tableName = config.tableName || 'session_state';
    this.db = null;
  }

  async read(sessionId) {
    const db = await this._getDb();
    const statement = db.prepare(
      `SELECT snapshot FROM ${this.tableName} WHERE session_id = ?`
    );
    const row = statement.get(sessionId);
    if (!row?.snapshot) {
      return null;
    }

    return JSON.parse(row.snapshot);
  }

  async write(snapshot) {
    const db = await this._getDb();
    const statement = db.prepare(
      `INSERT INTO ${this.tableName} (session_id, snapshot, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET
         snapshot = excluded.snapshot,
         updated_at = excluded.updated_at`
    );
    statement.run(
      snapshot.sessionId,
      JSON.stringify(snapshot),
      new Date().toISOString()
    );
  }

  async delete(sessionId) {
    const db = await this._getDb();
    const statement = db.prepare(
      `DELETE FROM ${this.tableName} WHERE session_id = ?`
    );
    const result = statement.run(sessionId);
    return result.changes > 0;
  }

  async _getDb() {
    if (this.db) {
      return this.db;
    }

    await fs.mkdir(path.dirname(this.databasePath), { recursive: true });
    const db = new DatabaseSync(this.databasePath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        session_id TEXT PRIMARY KEY,
        snapshot TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    this.db = db;
    return db;
  }
}

export const defaultSessionStateRepository = new SQLiteSessionStateRepository();
