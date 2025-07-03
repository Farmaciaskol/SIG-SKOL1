
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

// We only initialize Firebase if the API key is provided.
// This prevents the app from crashing if the .env file is not configured.
if (firebaseConfig.apiKey) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // Connect to emulators in development for safer local testing
    if (process.env.NODE_ENV === 'development') {
        try {
            console.log("Connecting to Firebase Emulators...");
            connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
            connectFirestoreEmulator(db, '127.0.0.1', 8080);
            connectStorageEmulator(storage, "127.0.0.1", 9199);
            console.log("Successfully connected to Firebase Emulators.");
        } catch (e: any) {
             // It's okay if it fails to connect, we just log it.
             // This can happen on hot reloads if it's already connected.
            if (e.code !== 'failed-precondition') {
                 console.error('Error connecting to Firebase emulators. Is the emulator suite running?', e);
            }
        }
    }

  } catch (e) {
    console.error('Error initializing Firebase. Please check your credentials in the .env file.', e);
    // If initialization fails, we reset the variables to undefined.
    app = undefined;
    auth = undefined;
    db = undefined;
    storage = undefined;
  }
}

export { app, auth, db, storage };
