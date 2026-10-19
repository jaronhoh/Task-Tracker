import { HttpError } from '../lib/rules.mjs';

// All operations use D1. The revision CAS and every diff share one atomic batch.
// A conflict reruns validation against a fresh snapshot; no stale row overwrites.
export class Repository {
  constructor(db) { if (!db) throw new Error('DB binding is required'); this.db = db; }
  async snapshot() {
    const results = await this.db.batch([
      this.db.prepare('SELECT * FROM app_revision WHERE id = 1'),
      this.db.prepare('SELECT * FROM app_sequence'),
      this.db.prepare('SELECT * FROM customers ORDER BY name COLLATE NOCASE'),
      this.db.prepare('SELECT * FROM tasks ORDER BY task_id'),
      this.db.prepare('SELECT * FROM log_time ORDER BY work_date DESC, start_time, id')
    ]);
    return { revision: results[0].results[0]?.revision ?? 0, sequence: results[1].results[0]?.next_value ?? 1, customers: results[2].results, tasks: results[3].results, log_time: results[4].results };
  }
  async transact(change) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const before = await this.snapshot();
      const state = structuredClone(before);
      const result = change(state);
      const token = crypto.randomUUID();
      const guard = 'EXISTS (SELECT 1 FROM app_revision WHERE id = 1 AND token = ?)';
      const statements = [this.db.prepare('INSERT INTO app_revision (id,revision,token) VALUES (1,1,?) ON CONFLICT(id) DO UPDATE SET revision = revision + 1, token = excluded.token WHERE revision = ? RETURNING revision').bind(token, before.revision)];
      if (state.sequence !== before.sequence) statements.push(this.db.prepare(`INSERT INTO app_sequence (sequence_name,next_value) SELECT 'task_id', ? WHERE ${guard} ON CONFLICT(sequence_name) DO UPDATE SET next_value = excluded.next_value`).bind(state.sequence, token));
      for (const [table, key] of [['customers','name'],['tasks','task_id'],['log_time','id']]) {
        const original = new Map(before[table].map(row => [row[key],row]));
        for (const row of before[table]) if (!state[table].some(r => r[key] === row[key])) statements.push(this.db.prepare(`DELETE FROM ${table} WHERE "${key}" = ? AND ${guard}`).bind(row[key],token));
        for (const row of state[table]) {
          const old = original.get(row[key]);
          if (JSON.stringify(old) === JSON.stringify(row)) continue;
          const fields = Object.keys(row);
          if (old) {
            statements.push(this.db.prepare(`UPDATE ${table} SET ${fields.map(f => `"${f}" = ?`).join(',')} WHERE "${key}" = ? AND ${guard}`).bind(...fields.map(f => row[f]),row[key],token));
          } else {
            statements.push(this.db.prepare(`INSERT INTO ${table} (${fields.map(f => `"${f}"`).join(',')}) SELECT ${fields.map(() => '?').join(',')} WHERE ${guard}`).bind(...fields.map(f => row[f]),token));
          }
        }
      }
      const committed = await this.db.batch(statements);
      if (committed[0].results.length) return result;
      await new Promise(resolve => setTimeout(resolve, Math.min(attempt * 3,50)));
    }
    throw new HttpError(409,'Concurrent changes prevented saving. Please retry.','WRITE_CONFLICT');
  }
  async allocateId() { return this.transact(s => `TSK-${String(s.sequence++).padStart(4,'0')}`); }
}

