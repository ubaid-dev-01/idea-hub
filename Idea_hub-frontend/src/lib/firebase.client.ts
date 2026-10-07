import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

/** Named app avoids mixing with `[DEFAULT]` and makes RTDB URL consistent across HMR. */
const FIREBASE_APP_NAME = 'ideahub-web';

function readPublicEnv(v: string | undefined): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

const firebaseConfig = {
  // IMPORTANT: keep static `process.env.X` reads so Next can inline them into client bundles.
  apiKey: readPublicEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: readPublicEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: readPublicEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: readPublicEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: readPublicEnv(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  ),
  appId: readPublicEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  measurementId: readPublicEnv(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
  databaseURL: readPublicEnv(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL),
};

export function hasFirebaseClientConfig(): boolean {
  const required = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ] as const;
  return required.every((k) => Boolean(firebaseConfig[k]));
}

export function missingFirebaseClientConfigKeys(): string[] {
  const req = [
    { key: 'apiKey', env: 'NEXT_PUBLIC_FIREBASE_API_KEY' },
    { key: 'authDomain', env: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN' },
    { key: 'projectId', env: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID' },
    { key: 'storageBucket', env: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET' },
    { key: 'messagingSenderId', env: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID' },
    { key: 'appId', env: 'NEXT_PUBLIC_FIREBASE_APP_ID' },
    { key: 'databaseURL', env: 'NEXT_PUBLIC_FIREBASE_DATABASE_URL' },
  ] as const;
  return req.filter((r) => !firebaseConfig[r.key]).map((r) => r.env);
}

function assertClientConfig() {
  const required = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ] as const;
  for (const k of required) {
    if (!firebaseConfig[k]) {
      throw new Error(`Missing NEXT_PUBLIC_FIREBASE config: ${k}`);
    }
  }
}

let app: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    assertClientConfig();
    const existing = getApps().find((a) => a.name === FIREBASE_APP_NAME);
    if (existing) {
      app = existing;
    } else {
      app = initializeApp(firebaseConfig, FIREBASE_APP_NAME);
    }
  }
  return app;
}

let db: Database | undefined;
let storage: FirebaseStorage | undefined;

export function getFirebaseDb(): Database {
  if (!firebaseConfig.databaseURL) {
    throw new Error('Missing NEXT_PUBLIC_FIREBASE_DATABASE_URL');
  }
  // Single-arg getDatabase(app) uses app.options.databaseURL — never mix with
  // getDatabase(app, url) or you get "Database initialized multiple times".
  db ??= getDatabase(getFirebaseApp());
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  storage ??= getStorage(getFirebaseApp());
  return storage;
}

export function tryGetFirebaseDb(): Database | null {
  try {
    return getFirebaseDb();
  } catch {
    return null;
  }
}
