import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyD69XIeMnTpxuSJ1QrrvvFeY1BEJ2N2ZOw",
  authDomain: "ligths-attendance.firebaseapp.com",
  projectId: "ligths-attendance",
  storageBucket: "ligths-attendance.firebasestorage.app",
  messagingSenderId: "910314455163",
  appId: "1:910314455163:web:20fb1a73e78dbdea9662de"
};

// Initialize Firebase app first
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (error) {
  // Handle the case where auth might already be initialized
  console.log("Auth initialization error:", error.message);
  // Fallback to get the existing auth instance
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db };