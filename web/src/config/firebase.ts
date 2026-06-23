import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  type Firestore,
} from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

const firebaseEnv = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const missingFirebaseEnvVars = Object.entries(firebaseEnv)
  .filter(([key, value]) => key !== 'VITE_FIREBASE_MEASUREMENT_ID' && !value)
  .map(([key]) => key);

export const isFirebaseConfigured = missingFirebaseEnvVars.length === 0;

const firebaseConfig = {
  apiKey: firebaseEnv.VITE_FIREBASE_API_KEY,
  authDomain: firebaseEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseEnv.VITE_FIREBASE_APP_ID,
  measurementId: firebaseEnv.VITE_FIREBASE_MEASUREMENT_ID,
};

let firebaseApp: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsClientInstance: Functions | null = null;

if (isFirebaseConfigured) {
  firebaseApp = initializeApp(firebaseConfig);
  authInstance = getAuth(firebaseApp);

  // Reduce Firestore log noise from non-fatal internals (e.g., BloomFilter fallback)
  setLogLevel('error');

  dbInstance = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });

  functionsClientInstance = getFunctions(firebaseApp);
} else {
  console.warn(
    `Missing required Firebase environment variables: ${missingFirebaseEnvVars.join(', ')}. ` +
      'Please copy .env.example to .env and fill in your Firebase configuration.'
  );
}

export const firebaseSetupMessage = isFirebaseConfigured
  ? ''
  : `Missing required Firebase environment variables: ${missingFirebaseEnvVars.join(', ')}. ` +
    'Please copy .env.example to .env and fill in your Firebase configuration.';

export const firebaseAppInstance = firebaseApp;
export const auth = authInstance as Auth;
export const googleProvider = new GoogleAuthProvider();
export const db = dbInstance as Firestore;
export const functionsClient = functionsClientInstance as Functions;
