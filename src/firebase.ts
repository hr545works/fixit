import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore,
  collection as realCollection,
  doc as realDoc,
  query as realQuery,
  where as realWhere,
  orderBy as realOrderBy,
  limit as realLimit,
  getDocs as realGetDocs,
  getDoc as realGetDoc,
  setDoc as realSetDoc,
  updateDoc as realUpdateDoc,
  addDoc as realAddDoc,
  deleteDoc as realDeleteDoc,
  onSnapshot as realOnSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { SEED_USERS } from './seedData';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with experimentalForceLongPolling to ensure reliability in iframe/sandboxed environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Error logging helpers
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'custom_auth',
      email: 'custom_user@dh',
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- SECURE OFFLINE LOCAL-FIRST FALLBACK SYSTEM ---

const LOCAL_STORAGE_PREFIX = 'smart_campus_offline_db_';
let offlineModeState = localStorage.getItem('smart_campus_offline_forced') === 'true';

export function isOfflineMode(): boolean {
  return offlineModeState;
}

export function enableOfflineMode() {
  if (!offlineModeState) {
    offlineModeState = true;
    localStorage.setItem('smart_campus_offline_forced', 'true');
    window.dispatchEvent(new Event('firestore-offline-status-changed'));
  }
}

export function disableOfflineMode() {
  if (offlineModeState) {
    offlineModeState = false;
    localStorage.setItem('smart_campus_offline_forced', 'false');
    window.dispatchEvent(new Event('firestore-offline-status-changed'));
  }
}

// Manually attempt to reconnect to the real cloud database. Call this from
// a "Retry Connection" button. It flips offlineModeState back to false so
// the next read/write/listener tries the real Firestore again; if that
// attempt also fails or times out, the existing getDocs/setDoc/onSnapshot
// fallback logic will automatically re-enable offline mode on its own.
export async function retryConnection(): Promise<boolean> {
  disableOfflineMode();
  try {
    const testRef = realCollection(db, 'metadata');
    await withTimeout(realGetDocs(testRef), 4000);
    // Success — stayed online (disableOfflineMode already fired the event).
    return true;
  } catch (err) {
    console.warn('retryConnection: still unable to reach the cloud database.', err);
    enableOfflineMode();
    return false;
  }
}

function getLocalCollection(colName: string): any[] {
  const data = localStorage.getItem(LOCAL_STORAGE_PREFIX + colName);
  if (!data) {
    if (colName === 'users') {
      localStorage.setItem(LOCAL_STORAGE_PREFIX + 'users', JSON.stringify(SEED_USERS));
      return SEED_USERS;
    }
    if (colName === 'metadata') {
      const initialMeta = [{ id: 'seeding', seeded: true, timestamp: Date.now() }];
      localStorage.setItem(LOCAL_STORAGE_PREFIX + 'metadata', JSON.stringify(initialMeta));
      return initialMeta;
    }
    return [];
  }
  return JSON.parse(data);
}

function saveLocalCollection(colName: string, items: any[]) {
  localStorage.setItem(LOCAL_STORAGE_PREFIX + colName, JSON.stringify(items));
}

// Timeout helper to prevent hanging queries in sandboxed environment
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout of ${ms}ms exceeded`));
    }, ms);
    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Drop-in Mock References
export function collection(dbInstance: any, pathName: string, ...pathSegments: string[]) {
  const fullPath = [pathName, ...pathSegments].join('/');
  return {
    __isMockRef: true,
    type: 'collection',
    path: fullPath,
    _realRef: dbInstance && !dbInstance.__isMockRef ? realCollection(dbInstance, pathName, ...pathSegments) : null
  };
}

export function doc(dbOrCol: any, pathName: string, ...pathSegments: string[]) {
  let fullPath = pathName;
  if (pathSegments.length > 0) {
    fullPath = [pathName, ...pathSegments].join('/');
  }
  const segments = fullPath.split('/');
  const colName = segments[0];
  const docId = segments.slice(1).join('/');
  
  return {
    __isMockRef: true,
    type: 'document',
    path: fullPath,
    colName,
    docId,
    _realRef: dbOrCol && !dbOrCol.__isMockRef && dbOrCol.app ? realDoc(dbOrCol, pathName, ...pathSegments) : null
  };
}

export function query(colRef: any, ...constraints: any[]) {
  return {
    __isMockRef: true,
    type: 'query',
    colRef,
    constraints,
    path: colRef.path,
    _realRef: colRef._realRef ? realQuery(colRef._realRef, ...constraints.map(c => c._realConstraint || c)) : null
  };
}

export function where(field: string, op: string, value: any) {
  return {
    type: 'where',
    field,
    op,
    value,
    _realConstraint: realWhere(field, op as any, value)
  };
}

export function orderBy(field: string, dir?: 'asc' | 'desc') {
  return {
    type: 'orderBy',
    field,
    dir: dir || 'asc',
    _realConstraint: realOrderBy(field, dir)
  };
}

export function limit(n: number) {
  return {
    type: 'limit',
    n,
    _realConstraint: realLimit(n)
  };
}

// Local query filter engine
function executeLocalQuery(queryRef: any) {
  const colName = queryRef.colRef ? queryRef.colRef.path : queryRef.path;
  let items = getLocalCollection(colName);
  
  if (queryRef.constraints && queryRef.constraints.length > 0) {
    for (const constraint of queryRef.constraints) {
      if (constraint.type === 'where') {
        const { field, op, value } = constraint;
        items = items.filter(item => {
          const itemVal = item[field];
          if (op === '==' || op === '===') return itemVal === value;
          if (op === '!=') return itemVal !== value;
          if (op === '>') return itemVal > value;
          if (op === '>=') return itemVal >= value;
          if (op === '<') return itemVal < value;
          if (op === '<=') return itemVal <= value;
          if (op === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(value);
          return true;
        });
      }
      if (constraint.type === 'orderBy') {
        const { field, dir } = constraint;
        items.sort((a, b) => {
          const aVal = a[field];
          const bVal = b[field];
          if (aVal < bVal) return dir === 'asc' ? -1 : 1;
          if (aVal > bVal) return dir === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }
    const limitConstraint = queryRef.constraints.find((c: any) => c.type === 'limit');
    if (limitConstraint) {
      items = items.slice(0, limitConstraint.n);
    }
  }
  
  const docs = items.map(item => ({
    id: item.id || '',
    data: () => item,
    exists: () => true
  }));
  
  return {
    empty: docs.length === 0,
    docs,
    size: docs.length,
    forEach: (callback: (doc: any) => void) => {
      docs.forEach(callback);
    }
  };
}

// Database Read Operations
export async function getDocs(queryRef: any) {
  if (isOfflineMode() || !queryRef._realRef) {
    return executeLocalQuery(queryRef);
  }
  try {
    const snap = await withTimeout(realGetDocs(queryRef._realRef), 2000);
    return snap;
  } catch (err) {
    console.warn('getDocs failed or timed out. Falling back to local DB.', err);
    enableOfflineMode();
    return executeLocalQuery(queryRef);
  }
}

function executeLocalGetDoc(docRef: any) {
  const { colName, docId } = docRef;
  const items = getLocalCollection(colName);
  const found = items.find(item => item.id === docId);
  return {
    exists: () => !!found,
    id: docId,
    data: () => found || null
  };
}

export async function getDoc(docRef: any) {
  if (isOfflineMode() || !docRef._realRef) {
    return executeLocalGetDoc(docRef);
  }
  try {
    const snap = await withTimeout(realGetDoc(docRef._realRef), 2000);
    return snap;
  } catch (err) {
    console.warn('getDoc failed or timed out. Falling back to local DB.', err);
    enableOfflineMode();
    return executeLocalGetDoc(docRef);
  }
}

// Database Write Operations
export async function setDoc(docRef: any, data: any, options?: any) {
  if (isOfflineMode() || !docRef._realRef) {
    return executeLocalSetDoc(docRef, data, options);
  }
  try {
    await withTimeout(realSetDoc(docRef._realRef, data, options), 2000);
    try { executeLocalSetDoc(docRef, data, options); } catch (e) {}
  } catch (err) {
    console.warn('setDoc failed or timed out. Switched to offline database.', err);
    enableOfflineMode();
    return executeLocalSetDoc(docRef, data, options);
  }
}

function executeLocalSetDoc(docRef: any, data: any, options?: any) {
  const { colName, docId } = docRef;
  const items = getLocalCollection(colName);
  const index = items.findIndex(item => item.id === docId);
  
  let newDoc = { ...data, id: docId };
  if (index >= 0) {
    if (options?.merge) {
      newDoc = { ...items[index], ...data, id: docId };
    }
    items[index] = newDoc;
  } else {
    items.push(newDoc);
  }
  
  saveLocalCollection(colName, items);
  triggerListenersForCollection(colName);
}

export async function updateDoc(docRef: any, data: any) {
  if (isOfflineMode() || !docRef._realRef) {
    return executeLocalUpdateDoc(docRef, data);
  }
  try {
    await withTimeout(realUpdateDoc(docRef._realRef, data), 2000);
    try { executeLocalUpdateDoc(docRef, data); } catch (e) {}
  } catch (err) {
    console.warn('updateDoc failed or timed out. Switched to offline database.', err);
    enableOfflineMode();
    return executeLocalUpdateDoc(docRef, data);
  }
}

function executeLocalUpdateDoc(docRef: any, data: any) {
  const { colName, docId } = docRef;
  const items = getLocalCollection(colName);
  const index = items.findIndex(item => item.id === docId);
  if (index >= 0) {
    items[index] = { ...items[index], ...data, id: docId };
  } else {
    // IMPORTANT: previously this branch threw an error, which was silently
    // swallowed by the try/catch around the mirror-write in updateDoc().
    // That meant any document that existed only on the real server (e.g. a
    // student account created after the local mirror was last seeded) would
    // NEVER get mirrored locally. Later, if the app fell back to offline
    // mode (e.g. on a page refresh with a slow connection), reads would hit
    // the local mirror and see stale/default data (like firstLogin: true)
    // even though the real update had succeeded. Upserting here keeps the
    // local mirror consistent with every successful write, online or not.
    items.push({ ...data, id: docId });
  }
  saveLocalCollection(colName, items);
  triggerListenersForCollection(colName);
}

export async function addDoc(colRef: any, data: any) {
  if (isOfflineMode() || !colRef._realRef) {
    return executeLocalAddDoc(colRef, data);
  }
  try {
    const res = await withTimeout(realAddDoc(colRef._realRef, data), 2000);
    try { executeLocalSetDoc({ colName: colRef.path, docId: res.id }, data); } catch (e) {}
    return res;
  } catch (err) {
    console.warn('addDoc failed or timed out. Switched to offline database.', err);
    enableOfflineMode();
    return executeLocalAddDoc(colRef, data);
  }
}

function executeLocalAddDoc(colRef: any, data: any) {
  const colName = colRef.path;
  const docId = 'local_' + Math.random().toString(36).substring(2) + '_' + Date.now();
  const items = getLocalCollection(colName);
  const newDoc = { ...data, id: docId };
  items.push(newDoc);
  saveLocalCollection(colName, items);
  triggerListenersForCollection(colName);
  return {
    id: docId,
    path: colName + '/' + docId
  };
}

export async function deleteDoc(docRef: any) {
  if (isOfflineMode() || !docRef._realRef) {
    return executeLocalDeleteDoc(docRef);
  }
  try {
    await withTimeout(realDeleteDoc(docRef._realRef), 2000);
    try { executeLocalDeleteDoc(docRef); } catch (e) {}
  } catch (err) {
    console.warn('deleteDoc failed or timed out. Switched to offline database.', err);
    enableOfflineMode();
    return executeLocalDeleteDoc(docRef);
  }
}

function executeLocalDeleteDoc(docRef: any) {
  const { colName, docId } = docRef;
  let items = getLocalCollection(colName);
  items = items.filter(item => item.id !== docId);
  saveLocalCollection(colName, items);
  triggerListenersForCollection(colName);
}

// Active Snapshot Observers registry
interface ActiveListener {
  id: string;
  colName: string;
  queryRef: any;
  onNext: (snapshot: any) => void;
}

let activeListeners: ActiveListener[] = [];

function triggerListenersForCollection(colName: string) {
  activeListeners.forEach(listener => {
    if (listener.colName === colName) {
      try {
        const snapshot = executeLocalQuery(listener.queryRef);
        listener.onNext(snapshot);
      } catch (err) {
        console.error('Error triggering local snapshot listener:', err);
      }
    }
  });
}

export function onSnapshot(queryRef: any, onNext: (snapshot: any) => void, onError?: (error: any) => void) {
  const colName = queryRef.colRef ? queryRef.colRef.path : queryRef.path;
  const listenerId = Math.random().toString(36).substring(2);

  let unsubscribeReal: (() => void) | null = null;
  let isUnsubscribed = false;
  let usingLocal = isOfflineMode() || !queryRef._realRef;
  let receivedInitialSnapshot = false;

  const setupLocalListener = () => {
    usingLocal = true;
    const listenerRecord: ActiveListener = {
      id: listenerId,
      colName,
      queryRef,
      onNext
    };
    activeListeners.push(listenerRecord);
    
    // Defer the local callback to match onSnapshot async callback schedule
    setTimeout(() => {
      if (isUnsubscribed) return;
      try {
        const snapshot = executeLocalQuery(queryRef);
        onNext(snapshot);
      } catch (err) {
        if (onError) onError(err);
      }
    }, 0);
  };

  if (!usingLocal && queryRef._realRef) {
    try {
      unsubscribeReal = realOnSnapshot(
        queryRef._realRef,
        (snapshot: any) => {
          if (isUnsubscribed) return;
          receivedInitialSnapshot = true;
          onNext(snapshot);
        },
        (err: any) => {
          if (isUnsubscribed) return;
          console.warn('Real onSnapshot received connection error. Switching to local fallback.', err);
          enableOfflineMode();
          if (!usingLocal) {
            setupLocalListener();
          }
        }
      );
      
      // If we don't get the initial snapshot from real firestore within 2 seconds, fall back
      setTimeout(() => {
        if (!isUnsubscribed && !usingLocal && !receivedInitialSnapshot) {
          console.warn('onSnapshot stream connection timeout. Activating secure offline mode.');
          enableOfflineMode();
          if (unsubscribeReal) {
            try { unsubscribeReal(); } catch (e) {}
          }
          setupLocalListener();
        }
      }, 2000);

    } catch (err) {
      console.warn('Failed to register real onSnapshot. Switching to local fallback.', err);
      enableOfflineMode();
      setupLocalListener();
    }
  } else {
    setupLocalListener();
  }

  return () => {
    isUnsubscribed = true;
    if (unsubscribeReal) {
      try { unsubscribeReal(); } catch (e) {}
    }
    activeListeners = activeListeners.filter(l => l.id !== listenerId);
  };
}
