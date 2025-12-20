import { Competition, Message, Resource, Task, MemoryBlock } from '../types';

const DB_NAME = 'kletta_workspace';
const DB_VERSION = 1;

// Store names
const STORES = {
  competitions: 'competitions',
  messages: 'messages',
  resources: 'resources',
  tasks: 'tasks',
  memory: 'memory',
  meta: 'meta',
} as const;

// --- Database Initialization ---

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Competitions store
      if (!db.objectStoreNames.contains(STORES.competitions)) {
        db.createObjectStore(STORES.competitions, { keyPath: 'id' });
      }

      // Messages store - keyed by competition ID
      if (!db.objectStoreNames.contains(STORES.messages)) {
        const msgStore = db.createObjectStore(STORES.messages, { keyPath: 'id' });
        msgStore.createIndex('competitionId', 'competitionId', { unique: false });
      }

      // Resources store
      if (!db.objectStoreNames.contains(STORES.resources)) {
        const resStore = db.createObjectStore(STORES.resources, { keyPath: 'id' });
        resStore.createIndex('competitionId', 'competitionId', { unique: false });
      }

      // Tasks store
      if (!db.objectStoreNames.contains(STORES.tasks)) {
        const taskStore = db.createObjectStore(STORES.tasks, { keyPath: 'id' });
        taskStore.createIndex('competitionId', 'competitionId', { unique: false });
      }

      // Memory store
      if (!db.objectStoreNames.contains(STORES.memory)) {
        const memStore = db.createObjectStore(STORES.memory, { keyPath: 'id' });
        memStore.createIndex('competitionId', 'competitionId', { unique: false });
      }

      // Meta store for app-level state
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: 'key' });
      }
    };
  });

  return dbPromise;
};

// --- Generic Helpers ---

const getAll = async <T>(storeName: string): Promise<T[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

const getAllByIndex = async <T>(
  storeName: string,
  indexName: string,
  indexValue: string
): Promise<T[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(indexValue);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

const put = async <T>(storeName: string, item: T): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const putAll = async <T>(storeName: string, items: T[]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    items.forEach((item) => store.put(item));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const deleteItem = async (storeName: string, key: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const clearStore = async (storeName: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- Stored Types (with competition association) ---

interface StoredMessage extends Omit<Message, 'timestamp'> {
  competitionId: string;
  timestamp: string; // ISO string for storage
}

interface StoredResource extends Resource {
  competitionId: string;
}

interface StoredTask extends Task {
  competitionId: string;
}

interface StoredMemory extends MemoryBlock {
  id: string;
  competitionId: string;
}

// --- Public API ---

// Competitions
export const loadCompetitions = (): Promise<Competition[]> => getAll(STORES.competitions);

export const saveCompetition = (comp: Competition): Promise<void> => put(STORES.competitions, comp);

export const saveCompetitions = (comps: Competition[]): Promise<void> => putAll(STORES.competitions, comps);

export const deleteCompetition = async (id: string): Promise<void> => {
  const db = await openDB();
  
  // 1. Delete the competition itself
  await deleteItem(STORES.competitions, id);

  // 2. Cascade delete related items in parallel
  const storesToClean = [STORES.messages, STORES.resources, STORES.tasks, STORES.memory];
  
  await Promise.all(storesToClean.map(storeName => {
    return new Promise<void>((resolve, reject) => {
        // We need to find items by competitionId index and delete them
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const index = store.index('competitionId');
        
        // getAllKeys is more efficient than getAll for just IDs
        const request = index.getAllKeys(id);
        
        request.onsuccess = () => {
           const keys = request.result;
           if (!keys || keys.length === 0) {
               resolve();
               return;
           }

           // Delete each item found
           let deletedCount = 0;
           keys.forEach(key => {
               store.delete(key);
               deletedCount++;
           });

           tx.oncomplete = () => resolve();
           tx.onerror = () => reject(tx.error);
        };
        
        request.onerror = () => reject(request.error);
    });
  }));
};

// Messages
export const loadMessages = async (competitionId: string): Promise<Message[]> => {
  const stored = await getAllByIndex<StoredMessage>(STORES.messages, 'competitionId', competitionId);
  return stored.map((m) => ({
    ...m,
    timestamp: new Date(m.timestamp),
  }));
};

export const saveMessages = async (competitionId: string, messages: Message[]): Promise<void> => {
  // Clear existing messages for this competition first
  const db = await openDB();
  const existing = await getAllByIndex<StoredMessage>(STORES.messages, 'competitionId', competitionId);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.messages, 'readwrite');
    const store = tx.objectStore(STORES.messages);

    // Delete old messages
    existing.forEach((m) => store.delete(m.id));

    // Add new messages
    messages.forEach((m) => {
      const stored: StoredMessage = {
        ...m,
        competitionId,
        timestamp: m.timestamp.toISOString(),
      };
      store.put(stored);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Resources
export const loadResources = async (competitionId: string): Promise<Resource[]> => {
  return getAllByIndex(STORES.resources, 'competitionId', competitionId);
};

export const saveResources = async (competitionId: string, resources: Resource[]): Promise<void> => {
  const db = await openDB();
  const existing = await getAllByIndex<StoredResource>(STORES.resources, 'competitionId', competitionId);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.resources, 'readwrite');
    const store = tx.objectStore(STORES.resources);

    existing.forEach((r) => store.delete(r.id));
    resources.forEach((r) => {
      const stored: StoredResource = { ...r, competitionId };
      store.put(stored);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Tasks
export const loadTasks = async (competitionId: string): Promise<Task[]> => {
  return getAllByIndex(STORES.tasks, 'competitionId', competitionId);
};

export const saveTasks = async (competitionId: string, tasks: Task[]): Promise<void> => {
  const db = await openDB();
  const existing = await getAllByIndex<StoredTask>(STORES.tasks, 'competitionId', competitionId);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.tasks, 'readwrite');
    const store = tx.objectStore(STORES.tasks);

    existing.forEach((t) => store.delete(t.id));
    tasks.forEach((t) => {
      const stored: StoredTask = { ...t, competitionId };
      store.put(stored);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Memory
export const loadMemory = async (competitionId: string): Promise<MemoryBlock[]> => {
  const stored = await getAllByIndex<StoredMemory>(STORES.memory, 'competitionId', competitionId);
  return stored.map(({ id, competitionId: _, ...rest }) => rest);
};

export const saveMemory = async (competitionId: string, memory: MemoryBlock[]): Promise<void> => {
  const db = await openDB();
  const existing = await getAllByIndex<StoredMemory>(STORES.memory, 'competitionId', competitionId);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.memory, 'readwrite');
    const store = tx.objectStore(STORES.memory);

    existing.forEach((m) => store.delete(m.id));
    memory.forEach((m, i) => {
      const stored: StoredMemory = {
        ...m,
        id: `${competitionId}-mem-${i}`,
        competitionId,
      };
      store.put(stored);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Meta (active competition, etc.)
export const getMeta = async <T>(key: string): Promise<T | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.meta, 'readonly');
    const store = tx.objectStore(STORES.meta);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => reject(request.error);
  });
};

export const setMeta = async <T>(key: string, value: T): Promise<void> => {
  return put(STORES.meta, { key, value });
};

// Clear all data
export const clearAllData = async (): Promise<void> => {
  await Promise.all([
    clearStore(STORES.competitions),
    clearStore(STORES.messages),
    clearStore(STORES.resources),
    clearStore(STORES.tasks),
    clearStore(STORES.memory),
    clearStore(STORES.meta),
  ]);
};

// Export workspace data
export interface WorkspaceExport {
  version: number;
  exportedAt: string;
  competitions: Competition[];
  messages: StoredMessage[];
  resources: StoredResource[];
  tasks: StoredTask[];
  memory: StoredMemory[];
}

export const exportWorkspace = async (): Promise<WorkspaceExport> => {
  const [competitions, messages, resources, tasks, memory] = await Promise.all([
    getAll<Competition>(STORES.competitions),
    getAll<StoredMessage>(STORES.messages),
    getAll<StoredResource>(STORES.resources),
    getAll<StoredTask>(STORES.tasks),
    getAll<StoredMemory>(STORES.memory),
  ]);

  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    competitions,
    messages,
    resources,
    tasks,
    memory,
  };
};

export const importWorkspace = async (data: WorkspaceExport): Promise<void> => {
  // 1. Basic Schema Validation
  if (!data || typeof data !== 'object') {
      throw new Error("Invalid import: Data must be a JSON object.");
  }
  
  if (data.version !== DB_VERSION) {
      console.warn(`Import version mismatch. Expected ${DB_VERSION}, got ${data.version}. Proceeding with caution.`);
  }

  const requiredArrays = ['competitions', 'messages', 'resources', 'tasks', 'memory'];
  for (const key of requiredArrays) {
      if (!Array.isArray((data as any)[key])) {
          throw new Error(`Invalid import: '${key}' is missing or not an array.`);
      }
  }

  // 3. Deep Content Validation
  const validateItem = (item: any, requiredFields: string[], context: string) => {
      if (!item || typeof item !== 'object') throw new Error(`Invalid item in ${context}: Must be an object.`);
      for (const field of requiredFields) {
          if (!(field in item)) throw new Error(`Invalid item in ${context}: Missing field '${field}'.`);
      }
  };

  data.competitions.forEach((c, i) => validateItem(c, ['id', 'name', 'status'], `competitions[${i}]`));
  data.messages.forEach((m, i) => validateItem(m, ['id', 'role', 'content', 'competitionId'], `messages[${i}]`));
  data.resources.forEach((r, i) => validateItem(r, ['id', 'title', 'type', 'competitionId'], `resources[${i}]`));
  data.tasks.forEach((t, i) => validateItem(t, ['id', 'title', 'status', 'competitionId'], `tasks[${i}]`));
  data.memory.forEach((m, i) => validateItem(m, ['id', 'label', 'value', 'competitionId'], `memory[${i}]`));

  // 4. Clear and Import
  await clearAllData();
  await Promise.all([
    putAll(STORES.competitions, data.competitions),
    putAll(STORES.messages, data.messages),
    putAll(STORES.resources, data.resources),
    putAll(STORES.tasks, data.tasks),
    putAll(STORES.memory, data.memory),
  ]);
};
