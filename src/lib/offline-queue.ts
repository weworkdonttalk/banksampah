// Offline Deposit Queue using native IndexedDB
export interface QueuedDeposit {
  id: string;
  userId: string;
  userName: string;
  wasteType: "ORGANIC" | "INORGANIC";
  materialName: string;
  weightGram: number;
  pointsEarned: number;
  co2SavedKg: number;
  createdAt: string;
  status: "PENDING_SYNC" | "SYNCED";
}

const DB_NAME = "ecosort_offline_db";
const STORE_NAME = "deposits_queue";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB tidak didukung"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function queueOfflineDeposit(deposit: QueuedDeposit): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(deposit);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // Fallback to localStorage if IndexedDB fails
    const list: QueuedDeposit[] = JSON.parse(
      localStorage.getItem("ecosort_offline_deposits") || "[]"
    );
    list.unshift(deposit);
    localStorage.setItem("ecosort_offline_deposits", JSON.stringify(list));
  }
}

export async function getQueuedDeposits(): Promise<QueuedDeposit[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    const list: QueuedDeposit[] = JSON.parse(
      localStorage.getItem("ecosort_offline_deposits") || "[]"
    );
    return list;
  }
}

export async function clearQueuedDeposits(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
  } catch {
    localStorage.removeItem("ecosort_offline_deposits");
  }
}
