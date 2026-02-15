// ============================================
// FIREBASE CONFIGURATION
// ============================================

// Import Firebase modules (v9+ modular)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBGSE2GfzcdftqmWKdJp_gOAqwFpxLTaQs",
  authDomain: "karting-95b36.firebaseapp.com",
  projectId: "karting-95b36",
  storageBucket: "karting-95b36.firebasestorage.app",
  messagingSenderId: "156441842966",
  appId: "1:156441842966:web:980d7093b0ca0296a1ec37",
  measurementId: "G-FY5V9SCR8G"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Exporter pour utilisation dans app.js
export { auth, db, googleProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where };
