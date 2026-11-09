/** In-memory adapter สำหรับ unit test และ local demo (ไม่ต้องต่อ Google) */
import { SHEETS } from './schema.js';
import { conflict, notFound } from '../lib/errors.js';

export function createMemoryAdapter(seed = {}) {
  const store = Object.fromEntries(Object.keys(SHEETS).map((t) => [t, [...(seed[t] || [])]]));
  const keyOf = (t) => SHEETS[t].key;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  return {
    _store: store,
    async list(t) { return store[t].map(clone); },
    async get(t, id) {
      const r = store[t].find((x) => String(x[keyOf(t)]) === String(id));
      return r ? clone(r) : null;
    },
    async insertMany(t, recs) { store[t].push(...recs.map(clone)); return recs; },
    async insert(t, rec) { store[t].push(clone(rec)); return rec; },
    async updateMany(t, changes) {
      const out = [];
      for (const { id, patch, expectedUpdatedAt } of changes) {
        const i = store[t].findIndex((x) => String(x[keyOf(t)]) === String(id));
        if (i < 0) throw notFound();
        if (expectedUpdatedAt && store[t][i].updated_at && store[t][i].updated_at !== expectedUpdatedAt) throw conflict();
        store[t][i] = { ...store[t][i], ...clone(patch) };
        out.push(clone(store[t][i]));
      }
      return out;
    },
    async update(t, id, patch, opts = {}) {
      const [r] = await this.updateMany(t, [{ id, patch, expectedUpdatedAt: opts.expectedUpdatedAt }]);
      return r;
    }
  };
}
