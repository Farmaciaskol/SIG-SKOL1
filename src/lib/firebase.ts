

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCMS9AZ60yzAVRkZU-GTDedLcyRy2BQ684",
  authDomain: "sgi-skol1.firebaseapp.com",
  databaseURL: "https://sgi-skol1-default-rtdb.firebaseio.com",
  projectId: "sgi-skol1",
  storageBucket: "sgi-skol1.firebasestorage.app",
  messagingSenderId: "445057289455",
  appId: "1:445057289455:web:0d1b854eecfa5395b85f1a"
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
