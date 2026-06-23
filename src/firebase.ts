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
  query,
  where,
  enableNetwork
} from 'firebase/firestore';
import config from '../firebase-applet-config.json';
import { DatabaseState, Store, Notification, UserProfile } from './types';

const app = initializeApp(config);
const databaseId = (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') 
  ? config.firestoreDatabaseId 
  : undefined;

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, databaseId as any);
export const auth = getAuth(app);

// Explicitly enable network to avoid "offline" errors
enableNetwork(db).catch(err => console.warn('Could not enable network:', err));

// Persistence disabled to avoid "offline" errors in preview environment
/*
try {
  enableIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed-precondition: multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence unimplemented in this browser');
      }
    });
} catch (e) {
  console.error('Error enabling Firestore persistence:', e);
}
*/

// Security & Diagnostics Error Handling Pattern required by Skill Guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

async function testConnection() {
  console.log("Iniciando teste de conexão com o Firestore...");
  try {
    // Attempt a direct server fetch to verify connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Teste de conexão Firestore: SUCESSO");
  } catch (error: any) {
    console.warn("Teste de conexão Firestore: FALHA", error.message);
    if (error.message.includes('offline') || error.code === 'unavailable') {
      console.info("Tentando forçar reconexão de rede...");
      await enableNetwork(db).catch(e => console.error("Falha ao habilitar rede:", e));
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

// testConnection(); // Disabled to prevent startup errors

export async function fetchUserProfile(email: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'user_profiles', email.toLowerCase());
    // Try getDoc first (hits cache if available, then network)
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    
    // If it's a transient offline error, don't throw, just return null so App can continue
    if (error?.message?.includes('offline') || error?.code === 'unavailable') {
      return null;
    }
    
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

// Global data access (Simplified: removing individual user filtering for shared dashboard)
export async function fetchFullDatabaseFromFirestore(): Promise<Omit<DatabaseState, 'pisos' | 'categorias' | 'tiposNotificacao'>> {
  try {
    // Ensure network is active
    await enableNetwork(db).catch(() => {});
    
    const storesSnapshot = await getDocs(collection(db, 'stores'));
    const stores: Store[] = [];
    storesSnapshot.forEach((docSnap) => {
      stores.push({ id: docSnap.id, ...docSnap.data() } as Store);
    });

    const notificationsSnapshot = await getDocs(collection(db, 'notifications'));
    const notifications: Notification[] = [];
    notificationsSnapshot.forEach((docSnap) => {
      notifications.push({ id: docSnap.id, ...docSnap.data() } as Notification);
    });

    return { stores, notifications };
  } catch (error) {
    console.error("Fetch database error:", error);
    handleFirestoreError(error, OperationType.GET, 'stores_and_notifications');
  }
}

// Safe Seed & Sync Operations
export async function migrateLocalDataToFirestore(state: DatabaseState): Promise<void> {
  try {
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
    const userId = auth.currentUser?.uid || 'anonymous';
    await setDoc(doc(db, 'stores', store.id), { ...store, userId });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stores/${store.id}`);
  }
}

export async function deleteStoreFromFirestore(storeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'stores', storeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `stores/${storeId}`);
  }
}

export async function saveNotificationToFirestore(notif: Notification): Promise<void> {
  try {
    const userId = auth.currentUser?.uid || 'anonymous';
    await setDoc(doc(db, 'notifications', notif.id), { ...notif, userId });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${notif.id}`);
  }
}

export async function deleteNotificationFromFirestore(notifId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notifications', notifId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${notifId}`);
  }
}

export { collection, getDoc, getDocs, setDoc, doc, deleteDoc, writeBatch, getDocFromServer };
