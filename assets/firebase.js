// Firebase initialization (Compat)
// Clean rebuild: session persistence, no forced sign-out logic.

// eslint-disable-next-line no-unused-vars
const firebaseConfig = {
  apiKey: "AIzaSyBIneZxhMpn5BneMyZgRpdkMDW9dSIPplk",
  // Use firebaseapp.com for auth to work across all domains
  authDomain: "cjf-rentals.firebaseapp.com",
  projectId: "cjf-rentals",
  storageBucket: "cjf-rentals.firebasestorage.app",
  messagingSenderId: "864727255016",
  appId: "1:864727255016:web:b2373b4b0645604f76c65d",
  measurementId: "G-B1P4X76KH2"
};

(function initFirebase(){
  if (!window.firebase) {
    console.error("Firebase SDK not loaded. Ensure CDN scripts are included before firebase.js");
    return;
  }
  if (window._firebaseInitialized) return;

  try {
    const app = firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    let storage = null;
    let analytics = null;
    try { if (firebase.storage) storage = firebase.storage(); } catch(e){ console.warn("Storage not available:", e.message); }
    try { if (firebase.analytics) analytics = firebase.analytics(); } catch(e){ console.warn("Analytics not available:", e.message); }

    // Clear any stale force sign-out flag
    localStorage.removeItem('_forceSignOut');

    // Use LOCAL persistence (should work on same-domain auth cookies)
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => console.log("Firebase Auth persistence enabled (LOCAL)"))
      .catch((error) => console.error("Failed to set Auth persistence:", error));

    window.firebaseApp = app;
    window.firebaseAuth = auth;
    window.firebaseDb = db;
    window.firebaseStorage = storage;
    window.firebaseAnalytics = analytics;
    window._firebaseInitialized = true;

    console.log("Firebase initialized");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
})();
