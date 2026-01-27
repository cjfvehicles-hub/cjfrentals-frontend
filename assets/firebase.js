// Firebase initialization (Compat)
// Clean rebuild: session persistence, no forced sign-out logic.

// eslint-disable-next-line no-unused-vars
const _defaultAuthDomain = "cjf-rentals.firebaseapp.com";
const _host = (typeof window !== "undefined" && window.location && window.location.hostname) ? window.location.hostname : "";
const _useCustomAuthDomain = _host === "cjfrentals.com" || _host === "www.cjfrentals.com";

const firebaseConfig = {
  apiKey: "AIzaSyBIneZxhMpn5BneMyZgRpdkMDW9dSIPplk",
  // On cjfrentals.com we proxy /__/auth/* + /__/firebase/* so the auth handler becomes first-party.
  // This avoids storage/cookie issues some browsers hit when using the firebaseapp.com handler cross-site.
  authDomain: _useCustomAuthDomain ? _host : _defaultAuthDomain,
  projectId: "cjf-rentals",
  storageBucket: "cjf-rentals.firebasestorage.app",
  messagingSenderId: "864727255016",
  appId: "1:864727255016:web:b2373b4b0645604f76c65d",
  measurementId: "G-B1P4X76KH2"
};

// Expose config for consumers that need to construct auth handler URLs
window.firebaseConfig = firebaseConfig;

(function initFirebase(){
  if (!window.firebase) {
    console.error("Firebase SDK not loaded. Ensure CDN scripts are included before firebase.js");
    return;
  }
  if (window._firebaseInitialized) return;

  try {
    const app = firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    let db = null;
    try { if (firebase.firestore) db = firebase.firestore(); }
    catch (e) { console.warn("Firestore not available:", e.message); }

    let storage = null;
    let analytics = null;
    try { if (firebase.storage) storage = firebase.storage(); } catch(e){ console.warn("Storage not available:", e.message); }
    // Analytics is optional and can trigger IndexedDB warnings under strict privacy modes; skip by default.
    // try { if (firebase.analytics) analytics = firebase.analytics(); } catch(e){ console.warn("Analytics not available:", e.message); }

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
