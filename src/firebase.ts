import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  writeBatch,
  getDocFromServer,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import config from '../firebase-applet-config.json';
import { DatabaseState, Store, Notification } from './types';

const app = initializeApp(config);
export const db = initializeFirestore(
  app,
  {},
  config.firestoreDatabaseId || '(default)'
);
export const auth = getAuth(app);

// Enable Firestore Local Persistence for better performance & offline support
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

// Security & Diagnostics Error Handling Pattern required by Skill Guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

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

// Validate connection constraint
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection tested successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Firebase is offline. Please check your Firestore database setup.");
    } else {
      console.warn("Firestore test connection check warning (expected if db rules are closed):", error);
    }
  }
}
testConnection();

// Safe Database Fetch with Error Mapping
export async function fetchFullDatabaseFromFirestore(): Promise<Omit<DatabaseState, 'pisos' | 'categorias' | 'tiposNotificacao'>> {
  try {
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
    handleFirestoreError(error, OperationType.GET, 'stores_and_notifications');
  }
}

// Safe Seed & Sync Operations
export async function migrateLocalDataToFirestore(state: DatabaseState): Promise<void> {
  try {
    const batch = writeBatch(db);

    for (const store of state.stores) {
      const storeRef = doc(db, 'stores', store.id);
      batch.set(storeRef, store);
    }

    for (const notif of state.notifications) {
      const notifRef = doc(db, 'notifications', notif.id);
      batch.set(notifRef, notif);
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
    await setDoc(doc(db, 'stores', store.id), store);
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
    await setDoc(doc(db, 'notifications', notif.id), notif);
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

export { collection, getDocs, setDoc, doc, deleteDoc, writeBatch, getDocFromServer };
