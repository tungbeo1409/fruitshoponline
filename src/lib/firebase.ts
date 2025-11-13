// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJLawwAPsObsqoqmuKlqdF3DGNKKOXmUQ",
  authDomain: "fruit-shop-8b83a.firebaseapp.com",
  projectId: "fruit-shop-8b83a",
  storageBucket: "fruit-shop-8b83a.firebasestorage.app",
  messagingSenderId: "2276568046",
  appId: "1:2276568046:web:42244ff56a91d17190bcff",
  measurementId: "G-3XNCKPCEB8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics (only in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;

