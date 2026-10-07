import admin from 'firebase-admin';

type FirebaseDatabase = ReturnType<typeof admin.database>;
type FirebaseStorageService = ReturnType<typeof admin.storage>;

let initialized = false;

function ensureFirebase(): void {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin: missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY'
    );
  }
  if (!databaseURL) {
    throw new Error(
      'Firebase Admin: FIREBASE_DATABASE_URL is required for Realtime Database (scan_updates, presence, etc.)'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket,
    databaseURL,
  });
  initialized = true;
}

export function getFirebaseDb(): FirebaseDatabase {
  ensureFirebase();
  return admin.database();
}

export function getFirebaseStorage(): FirebaseStorageService {
  ensureFirebase();
  return admin.storage();
}

/** @deprecated Prefer getFirebaseDb() — lazy init for serverless. */
export const db: FirebaseDatabase = new Proxy({} as FirebaseDatabase, {
  get(_target, prop, receiver) {
    const real = getFirebaseDb() as unknown as Record<PropertyKey, unknown>;
    const value = real[prop as PropertyKey];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

/** @deprecated Prefer getFirebaseStorage() */
export const storage: FirebaseStorageService = new Proxy(
  {} as FirebaseStorageService,
  {
    get(_target, prop) {
      const real = getFirebaseStorage() as unknown as Record<PropertyKey, unknown>;
      const value = real[prop as PropertyKey];
      return typeof value === 'function' ? value.bind(real) : value;
    },
  }
);

export default admin;
