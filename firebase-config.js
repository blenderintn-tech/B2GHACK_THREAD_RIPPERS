// Your Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB0l7-U-0KfpuP-TEP3RRBuCAuDSGv-xv0",
  authDomain: "univ-verse-6de98.firebaseapp.com",
  projectId: "univ-verse-6de98",
  storageBucket: "univ-verse-6de98.firebasestorage.app",
  messagingSenderId: "322129692167",
  appId: "1:322129692167:web:d5e04dc609db934e958ca2",
  measurementId: "G-T5TTT3RY2N"
};
// Initialize Firebase (using compat version)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Make available globally
window.auth = auth;
window.db = db;
window.storage = storage;

console.log('🔥 Firebase initialized successfully');