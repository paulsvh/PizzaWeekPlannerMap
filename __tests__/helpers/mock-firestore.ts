import { vi } from 'vitest';

/**
 * Lightweight in-memory Firestore mock that covers the subset of the
 * Admin SDK used by this project.
 *
 * Backed by a Map<collectionName, Map<docId, data>>.
 *
 * Usage:
 *   import './mock-firestore';          // installs the vi.mock
 *   import { mockDb } from './mock-firestore';
 *   beforeEach(() => mockDb.reset());   // clear between tests
 */

type DocData = Record<string, unknown>;

class MockDocSnapshot {
  readonly id: string;
  readonly ref: MockDocRef;
  private _data: DocData | undefined;

  constructor(id: string, ref: MockDocRef, data: DocData | undefined) {
    this.id = id;
    this.ref = ref;
    this._data = data;
  }

  get exists(): boolean {
    return this._data !== undefined;
  }

  data(): DocData | undefined {
    return this._data ? { ...this._data } : undefined;
  }
}

class MockDocRef {
  readonly id: string;
  private collectionName: string;
  private db: MockFirestore;

  constructor(db: MockFirestore, collection: string, id: string) {
    this.db = db;
    this.collectionName = collection;
    this.id = id;
  }

  async get(): Promise<MockDocSnapshot> {
    const data = this.db._get(this.collectionName, this.id);
    return new MockDocSnapshot(this.id, this, data);
  }

  async set(data: DocData, opts?: { merge?: boolean }): Promise<void> {
    if (opts?.merge) {
      const existing = this.db._get(this.collectionName, this.id) ?? {};
      this.db._set(this.collectionName, this.id, { ...existing, ...data });
    } else {
      this.db._set(this.collectionName, this.id, { ...data });
    }
  }

  async update(data: DocData): Promise<void> {
    const existing = this.db._get(this.collectionName, this.id);
    if (!existing) throw new Error(`Document ${this.collectionName}/${this.id} not found`);
    this.db._set(this.collectionName, this.id, { ...existing, ...data });
  }

  async delete(): Promise<void> {
    this.db._delete(this.collectionName, this.id);
  }
}

class MockQuery {
  private db: MockFirestore;
  private collectionName: string;
  private filters: Array<{
    field: string;
    op: string;
    value: unknown;
  }> = [];
  private _orderByField?: string;
  private _orderByDir?: 'asc' | 'desc';
  private _limit?: number;

  constructor(db: MockFirestore, collectionName: string) {
    this.db = db;
    this.collectionName = collectionName;
  }

  where(field: string, op: string, value: unknown): MockQuery {
    const q = this._clone();
    q.filters.push({ field, op, value });
    return q;
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): MockQuery {
    const q = this._clone();
    q._orderByField = field;
    q._orderByDir = dir;
    return q;
  }

  limit(n: number): MockQuery {
    const q = this._clone();
    q._limit = n;
    return q;
  }

  async get(): Promise<{
    empty: boolean;
    docs: MockDocSnapshot[];
    size: number;
  }> {
    const collection = this.db._collection(this.collectionName);
    let results: Array<{ id: string; data: DocData }> = [];

    for (const [id, data] of collection.entries()) {
      let match = true;
      for (const f of this.filters) {
        const val = data[f.field];
        if (f.op === '==') {
          match = val === f.value;
        }
        if (!match) break;
      }
      if (match) results.push({ id, data });
    }

    if (this._orderByField) {
      const field = this._orderByField;
      const dir = this._orderByDir === 'desc' ? -1 : 1;
      results.sort((a, b) => {
        const av = a.data[field];
        const bv = b.data[field];
        if (typeof av === 'number' && typeof bv === 'number')
          return (av - bv) * dir;
        return 0;
      });
    }

    if (this._limit !== undefined) {
      results = results.slice(0, this._limit);
    }

    const docs = results.map(
      (r) =>
        new MockDocSnapshot(
          r.id,
          new MockDocRef(this.db, this.collectionName, r.id),
          r.data,
        ),
    );

    return { empty: docs.length === 0, docs, size: docs.length };
  }

  private _clone(): MockQuery {
    const q = new MockQuery(this.db, this.collectionName);
    q.filters = [...this.filters];
    q._orderByField = this._orderByField;
    q._orderByDir = this._orderByDir;
    q._limit = this._limit;
    return q;
  }
}

class MockCollectionRef extends MockQuery {
  private _db: MockFirestore;
  private _name: string;
  private _autoIdCounter = 0;

  constructor(db: MockFirestore, name: string) {
    super(db, name);
    this._db = db;
    this._name = name;
  }

  doc(id?: string): MockDocRef {
    const docId = id ?? `auto-${++this._autoIdCounter}`;
    return new MockDocRef(this._db, this._name, docId);
  }
}

class MockTransaction {
  private db: MockFirestore;

  constructor(db: MockFirestore) {
    this.db = db;
  }

  async get(ref: MockDocRef): Promise<MockDocSnapshot> {
    return ref.get();
  }

  set(ref: MockDocRef, data: DocData, opts?: { merge?: boolean }): void {
    // Synchronously queue the write (simplified — real transactions buffer).
    const collName = (ref as unknown as { collectionName: string }).collectionName;
    const id = ref.id;
    if (opts?.merge) {
      const existing = this.db._get(collName, id) ?? {};
      this.db._set(collName, id, { ...existing, ...data });
    } else {
      this.db._set(collName, id, { ...data });
    }
  }

  update(ref: MockDocRef, data: DocData): void {
    const collName = (ref as unknown as { collectionName: string }).collectionName;
    const id = ref.id;
    const existing = this.db._get(collName, id);
    if (!existing) throw new Error(`Transaction update: doc not found`);
    this.db._set(collName, id, { ...existing, ...data });
  }

  delete(ref: MockDocRef): void {
    const collName = (ref as unknown as { collectionName: string }).collectionName;
    this.db._delete(collName, ref.id);
  }
}

class MockBatch {
  private ops: Array<() => void> = [];

  delete(ref: MockDocRef): void {
    this.ops.push(() => {
      ref.delete();
    });
  }

  async commit(): Promise<void> {
    for (const op of this.ops) {
      op();
    }
  }
}

class MockFirestore {
  private store = new Map<string, Map<string, DocData>>();

  collection(name: string): MockCollectionRef {
    return new MockCollectionRef(this, name);
  }

  async runTransaction<T>(
    fn: (tx: MockTransaction) => Promise<T>,
  ): Promise<T> {
    const tx = new MockTransaction(this);
    return fn(tx);
  }

  batch(): MockBatch {
    return new MockBatch();
  }

  async getAll(
    ...refs: MockDocRef[]
  ): Promise<MockDocSnapshot[]> {
    return Promise.all(refs.map((ref) => ref.get()));
  }

  // --- Internal helpers used by refs/queries ---

  _collection(name: string): Map<string, DocData> {
    if (!this.store.has(name)) {
      this.store.set(name, new Map());
    }
    return this.store.get(name)!;
  }

  _get(collection: string, id: string): DocData | undefined {
    return this._collection(collection).get(id);
  }

  _set(collection: string, id: string, data: DocData): void {
    this._collection(collection).set(id, data);
  }

  _delete(collection: string, id: string): void {
    this._collection(collection).delete(id);
  }

  /** Clear all data between tests. */
  reset(): void {
    this.store.clear();
  }
}

export const mockDb = new MockFirestore();

// Mock the firebase admin module to return our in-memory DB.
vi.mock('@/lib/firebase/admin', () => ({
  getDb: () => mockDb,
}));

// Mock FieldValue.serverTimestamp to return a plain number.
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => Date.now(),
  },
}));
