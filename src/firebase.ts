import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  collection, 
  getDoc,
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  writeBatch,
  getDocFromServer,
  getDocsFromServer,
  query,
  where,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import config from '../firebase-applet-config.json';
import { DatabaseState, Store, Notification, UserProfile, GlobalSettings } from './types';

const app = initializeApp(config);
const databaseId = (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') 
  ? config.firestoreDatabaseId 
  : undefined;

// Use a more robust initialization
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, databaseId);
export const auth = getAuth(app);

// Global connection state
let isNetworkEnabled = false;

async function ensureNetwork(force = false) {
  if (isNetworkEnabled && !force) return;
  try {
    // If we are forcing, we might want to disable first to "reset" the connection
    if (force) {
      await disableNetwork(db).catch(() => {});
    }
    await enableNetwork(db);
    isNetworkEnabled = true;
    console.log('Firestore network enabled successfully.');
  } catch (err: any) {
    console.warn('Could not enable Firestore network:', err.message);
    // Even if it fails, we don't want to spam it, but if it was forced we reset the flag
    if (force) isNetworkEnabled = false;
  }
}

// Initial call
ensureNetwork();

// Security & Diagnostics Error Handling Pattern required by Skill Guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

async function testConnection(retries = 3) {
  console.log(`Iniciando teste de conexão com o Firestore (tentativas restantes: ${retries})...`);
  try {
    await ensureNetwork(retries < 3); // Force enable on retries
    // Attempt a direct server fetch to verify connectivity
    await getDocFromServer(doc(db, 'test', 'connection')).catch(err => {
      // If document doesn't exist, it's still a successful connection if it didn't throw an offline error
      if (err.code === 'not-found') return;
      throw err;
    });
    console.log("Teste de conexão Firestore: SUCESSO");
  } catch (error: any) {
    console.warn("Teste de conexão Firestore: FALHA", error.message);
    const isOffline = error.message.includes('offline') || error.code === 'unavailable' || error.code === 'failed-precondition';
    if (retries > 0 && isOffline) {
      console.info("Tentando reconectar em 3 segundos...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      return testConnection(retries - 1);
    }
  }
}
testConnection();

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Info:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function fetchUserProfile(email: string, retries = 2): Promise<UserProfile | null> {
  try {
    await ensureNetwork();
    const docRef = doc(db, 'user_profiles', email.toLowerCase());
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error: any) {
    const isOffline = error?.message?.includes('offline') || error?.code === 'unavailable' || error?.code === 'failed-precondition';
    
    if (isOffline && retries > 0) {
      console.warn(`Fetch user profile failed (offline), retrying... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return fetchUserProfile(email, retries - 1);
    }

    if (isOffline) {
      console.info("Returning null for user profile due to offline state after retries.");
      return null;
    }

    console.error("Error fetching user profile:", error);
    handleFirestoreError(error, OperationType.GET, `user_profiles/${email}`);
    return null;
  }
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  try {
    await setDoc(doc(db, 'user_profiles', profile.email.toLowerCase()), {
      ...profile,
      email: profile.email.toLowerCase(),
      createdAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `user_profiles/${profile.email}`);
  }
}

export async function fetchFullDatabaseFromFirestore(retries = 4): Promise<Omit<DatabaseState, 'pisos' | 'categorias' | 'tiposNotificacao'>> {
  try {
    await ensureNetwork(retries < 4); // Force enable on retries
    
    // Using getDocs normally, but the error "client is offline" often comes from a mismatch in state
    let storesSnapshot;
    try {
      storesSnapshot = await getDocs(collection(db, 'stores'));
    } catch (err: any) {
      if (err.message?.includes('offline')) {
        console.warn('Firestore offline, attempting to fetch from server directly...');
        storesSnapshot = await getDocsFromServer(collection(db, 'stores'));
      } else {
        throw err;
      }
    }

    const stores: Store[] = [];
    storesSnapshot.forEach((docSnap) => {
      stores.push({ id: docSnap.id, ...docSnap.data() } as Store);
    });

    let notificationsSnapshot;
    try {
      notificationsSnapshot = await getDocs(collection(db, 'notifications'));
    } catch (err: any) {
      if (err.message?.includes('offline')) {
        notificationsSnapshot = await getDocsFromServer(collection(db, 'notifications'));
      } else {
        throw err;
      }
    }

    const notifications: Notification[] = [];
    notificationsSnapshot.forEach((docSnap) => {
      notifications.push({ id: docSnap.id, ...docSnap.data() } as Notification);
    });

    let settingsDoc;
    try {
      settingsDoc = await getDoc(doc(db, 'config', 'global'));
    } catch (err: any) {
      if (err.message?.includes('offline')) {
        settingsDoc = await getDocFromServer(doc(db, 'config', 'global'));
      } else {
        throw err;
      }
    }
    const settings = settingsDoc.exists() ? settingsDoc.data() as GlobalSettings : undefined;

    return { stores, notifications, settings };
  } catch (error: any) {
    const isOffline = error?.message?.includes('offline') || 
                      error?.code === 'unavailable' || 
                      error?.code === 'failed-precondition' ||
                      error?.message?.includes('network');
    
    if (isOffline && retries > 0) {
      console.warn(`Fetch database failed (${error.message}), retrying... (${retries} left)`);
      // Exponential backoff
      const delay = (5 - retries) * 1500;
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchFullDatabaseFromFirestore(retries - 1);
    }

    console.error("Fetch database error:", error);
    handleFirestoreError(error, OperationType.GET, 'stores_and_notifications');
    return { stores: [], notifications: [], settings: undefined };
  }
}

export async function updateGlobalSettings(settings: GlobalSettings): Promise<void> {
  try {
    await ensureNetwork();
    await setDoc(doc(db, 'config', 'global'), settings, { merge: true });
  } catch (error) {
    console.error("Error updating global settings:", error);
    handleFirestoreError(error, OperationType.WRITE, 'config/global');
  }
}

// Safe Seed & Sync Operations
export async function migrateLocalDataToFirestore(state: DatabaseState): Promise<void> {
  try {
    await ensureNetwork();
    const userId = auth.currentUser?.uid || 'anonymous';
    const batch = writeBatch(db);

    for (const store of state.stores) {
      const storeRef = doc(db, 'stores', store.id);
      batch.set(storeRef, { ...store, userId });
    }

    for (const notif of state.notifications) {
      const notifRef = doc(db, 'notifications', notif.id);
      batch.set(notifRef, { ...notif, userId });
    }

    await batch.commit();
    console.log('Successfully saved database state to Firestore Cloud!');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'migrate_local_data');
  }
}

// Safe Store & Notification CRUD Wrappers to abstract Firestore errors
export async function saveStoreToFirestore(store: Store): Promise<void> {
  try {
    await ensureNetwork();
    const userId = auth.currentUser?.uid || 'anonymous';
    await setDoc(doc(db, 'stores', store.id), { ...store, userId });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stores/${store.id}`);
  }
}

export async function deleteStoreFromFirestore(storeId: string): Promise<void> {
  try {
    await ensureNetwork();
    await deleteDoc(doc(db, 'stores', storeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `stores/${storeId}`);
  }
}

export async function saveNotificationToFirestore(notif: Notification): Promise<void> {
  try {
    await ensureNetwork();
    const userId = auth.currentUser?.uid || 'anonymous';
    await setDoc(doc(db, 'notifications', notif.id), { ...notif, userId });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${notif.id}`);
  }
}

export async function deleteNotificationFromFirestore(notifId: string): Promise<void> {
  try {
    await ensureNetwork();
    await deleteDoc(doc(db, 'notifications', notifId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${notifId}`);
  }
}

export { collection, getDoc, getDocs, setDoc, doc, deleteDoc, writeBatch, getDocFromServer };
