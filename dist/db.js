"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultDatabase = void 0;
const sql_js_1 = __importDefault(require("sql.js"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class VaultDatabase {
    constructor(workspacePath) {
        this.db = null;
        this.initialized = false;
        this.vaultDir = path_1.default.join(workspacePath, 'context-vault');
        this.dbPath = path_1.default.join(this.vaultDir, 'vault.db');
    }
    async initialize() {
        if (this.initialized)
            return;
        const SQL = await (0, sql_js_1.default)();
        if (!fs_1.default.existsSync(this.vaultDir)) {
            fs_1.default.mkdirSync(this.vaultDir, { recursive: true });
        }
        // Load existing database if it exists
        if (fs_1.default.existsSync(this.dbPath)) {
            const buffer = fs_1.default.readFileSync(this.dbPath);
            this.db = new SQL.Database(buffer);
        }
        else {
            this.db = new SQL.Database();
        }
        this.initializeSchema();
        this.initialized = true;
    }
    initializeSchema() {
        if (!this.db)
            throw new Error('Database not initialized');
        // Create tables
        this.db.run(`
      CREATE TABLE IF NOT EXISTS facts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('decision', 'error', 'preference', 'contact', 'information')),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        details TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        system TEXT,
        verified INTEGER NOT NULL DEFAULT 0,
        source TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
        this.db.run(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        fact_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fact_id) REFERENCES facts(id)
      )
    `);
    }
    saveFact(fact) {
        if (!this.db)
            throw new Error('Database not initialized');
        const detailsJson = JSON.stringify(fact.details);
        try {
            this.db.run(`INSERT OR REPLACE INTO facts 
         (id, type, title, content, details, timestamp, sessionId, system, verified, source, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [
                fact.id,
                fact.type,
                fact.title,
                fact.content,
                detailsJson,
                fact.timestamp,
                fact.sessionId,
                fact.system || null,
                fact.verified ? 1 : 0,
                fact.source
            ]);
            this.logAudit(fact.id, 'SAVED', `Saved ${fact.type}`);
            this.save();
        }
        catch (err) {
            console.error('Error saving fact:', err);
        }
    }
    getFact(id) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const results = this.db.exec(`SELECT * FROM facts WHERE id = ?`, [id]);
            if (!results || results.length === 0)
                return null;
            const rows = results[0].values;
            if (rows.length === 0)
                return null;
            const row = rows[0];
            return this.rowToFact(row, results[0].columns);
        }
        catch (err) {
            console.error('Error getting fact:', err);
            return null;
        }
    }
    searchFacts(query, type, system, verifiedOnly = false) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            let sql = 'SELECT * FROM facts WHERE 1=1';
            const params = [];
            if (query && query.trim()) {
                sql += ` AND (title LIKE ? OR content LIKE ? OR system LIKE ?)`;
                const searchTerm = `%${query}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }
            if (type) {
                sql += ' AND type = ?';
                params.push(type);
            }
            if (system) {
                sql += ' AND system = ?';
                params.push(system);
            }
            if (verifiedOnly) {
                sql += ' AND verified = 1';
            }
            sql += ' ORDER BY timestamp DESC LIMIT 100';
            const results = this.db.exec(sql, params);
            if (!results || results.length === 0)
                return [];
            const rows = results[0].values;
            const columns = results[0].columns;
            return rows.map(row => this.rowToFact(row, columns));
        }
        catch (err) {
            console.error('Error searching facts:', err);
            return [];
        }
    }
    getFactsByType(type, limit = 50) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const results = this.db.exec(`SELECT * FROM facts WHERE type = ? ORDER BY timestamp DESC LIMIT ?`, [type, limit]);
            if (!results || results.length === 0)
                return [];
            const rows = results[0].values;
            const columns = results[0].columns;
            return rows.map(row => this.rowToFact(row, columns));
        }
        catch (err) {
            console.error('Error getting facts by type:', err);
            return [];
        }
    }
    getRecentFacts(days = 7) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
            const results = this.db.exec(`SELECT * FROM facts WHERE timestamp > ? ORDER BY timestamp DESC`, [cutoff]);
            if (!results || results.length === 0)
                return [];
            const rows = results[0].values;
            const columns = results[0].columns;
            return rows.map(row => this.rowToFact(row, columns));
        }
        catch (err) {
            console.error('Error getting recent facts:', err);
            return [];
        }
    }
    verifyFact(id) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            this.db.run('UPDATE facts SET verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
            this.logAudit(id, 'VERIFIED', 'Fact verified');
            this.save();
        }
        catch (err) {
            console.error('Error verifying fact:', err);
        }
    }
    updateFact(id, updates) {
        if (!this.db)
            throw new Error('Database not initialized');
        const current = this.getFact(id);
        if (!current)
            throw new Error(`Fact ${id} not found`);
        const updated = { ...current, ...updates };
        this.saveFact(updated);
    }
    deleteFact(id) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            this.db.run('DELETE FROM facts WHERE id = ?', [id]);
            this.logAudit(id, 'DELETED', 'Fact deleted');
            this.save();
        }
        catch (err) {
            console.error('Error deleting fact:', err);
        }
    }
    logAudit(factId, action, details) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.db.run(`INSERT INTO audit_log (id, fact_id, action, details) VALUES (?, ?, ?, ?)`, [id, factId, action, details]);
        }
        catch (err) {
            console.error('Error logging audit:', err);
        }
    }
    rowToFact(row, columns) {
        const obj = {};
        columns.forEach((col, idx) => {
            obj[col] = row[idx];
        });
        return {
            id: obj.id,
            type: obj.type,
            title: obj.title,
            content: obj.content,
            details: JSON.parse(obj.details),
            timestamp: obj.timestamp,
            sessionId: obj.sessionId,
            system: obj.system,
            verified: Boolean(obj.verified),
            source: obj.source,
        };
    }
    save() {
        if (!this.db)
            return;
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            fs_1.default.writeFileSync(this.dbPath, buffer);
        }
        catch (err) {
            console.error('Error saving database:', err);
        }
    }
    close() {
        if (this.db) {
            this.save();
            this.db.close();
            this.db = null;
        }
    }
}
exports.VaultDatabase = VaultDatabase;
//# sourceMappingURL=db.js.map