/**
 * Authentication & Authorization Module
 * Clean rebuild to remove corrupted escape sequences and prevent mobile bounce/auto-signout.
 * Uses Firebase Auth as the single source of truth.
 */

const AuthManager = (function() {
  'use strict';

  // User roles
  const ROLES = {
    GUEST: 'guest',
    HOST: 'host',
    ADMIN: 'admin',
  };

  // Admin override email (this account always gets ADMIN privileges in the UI)
  const SPECIAL_ADMIN_EMAIL = 'cjfvehicles@gmail.com';

  // Storage keys
  const STORAGE_KEYS = {
    CURRENT_USER: 'CJF_CURRENT_USER',
    USER_ROLE: 'CJF_USER_ROLE',
    ADMIN_MODE: 'CJF_ADMIN_MODE',
  };

  let authListenerAttached = false;
  let cachedFirebaseUser = null;
  let cachedLocalUser = null;

  function getCurrentUser() {
    try {
      const json = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return json ? JSON.parse(json) : null;
    } catch (e) {
      console.error('Error parsing current user:', e);
      return null;
    }
  }

  function getFirebaseUser() {
    return window.firebaseAuth ? window.firebaseAuth.currentUser : null;
  }

  function getUserRole() {
    const user = getCurrentUser();
    return user?.role || ROLES.GUEST;
  }

  function isAuthenticated() {
    if (window.firebaseAuth?.currentUser) return true;
    return getCurrentUser() !== null;
  }

  function isHost() {
    const role = getUserRole();
    return role === ROLES.HOST || role === ROLES.ADMIN;
  }

  function isAdmin() {
    return getUserRole() === ROLES.ADMIN || isSpecialAdminUser();
  }

  // Admin mode is a UI/UX toggle for the special admin account.
  // It controls whether admin-only pages and admin navigation are shown.
  function isAdminModeEnabled() {
    // Only the special admin can use admin mode toggle.
    if (!isSpecialAdminUser()) return getUserRole() === ROLES.ADMIN;
    const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_MODE);
    if (raw === null) return true; // default ON for the special admin
    return raw === 'true';
  }

  function setAdminModeEnabled(enabled) {
    if (!isSpecialAdminUser()) return false;
    const normalized = enabled === true;
    localStorage.setItem(STORAGE_KEYS.ADMIN_MODE, normalized ? 'true' : 'false');
    // Keep the stored role in sync so existing UI logic stays consistent.
    updateProfile({ role: normalized ? ROLES.ADMIN : ROLES.HOST });
    updateUIForRole();
    return true;
  }

  function isSpecialAdminUser(user) {
    const target = user || getFirebaseUser() || getCurrentUser();
    const email = (target?.email || '').toLowerCase();
    return !!email && email === SPECIAL_ADMIN_EMAIL;
  }

  function isOwner(resourceHostId) {
    const user = getCurrentUser();
    return !!(user && user.id === resourceHostId);
  }

  function syncLocalUser(firebaseUser) {
    if (!firebaseUser) return null;
    const storedRole = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
    const validStoredRole = storedRole && Object.values(ROLES).includes(storedRole) ? storedRole : ROLES.HOST;
    const email = (firebaseUser.email || '').toLowerCase();
    let effectiveRole = validStoredRole;
    if (email === SPECIAL_ADMIN_EMAIL) {
      const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_MODE);
      const adminMode = raw === null ? true : raw === 'true';
      effectiveRole = adminMode ? ROLES.ADMIN : ROLES.HOST;
    }
    const localUser = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || (firebaseUser.email || '').split('@')[0],
      email: firebaseUser.email || '',
      phone: '',
      role: effectiveRole,
      lastSync: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(localUser));
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, effectiveRole);
    cachedLocalUser = localUser;
    return localUser;
  }

  function updateUIForRole() {
    const authenticated = isAuthenticated();
    const isUserHost = isHost();
    const isUserAdmin = isAdmin();
    // Toggle host-only elements
    document.querySelectorAll('[data-host-only]').forEach((el) => {
      el.style.display = isUserHost || isUserAdmin ? '' : 'none';
    });

    // Hide elements that should not be visible to signed-in hosts/admins
    document.querySelectorAll('[data-hide-when-host]').forEach((el) => {
      el.style.display = authenticated && (isUserHost || isUserAdmin) ? 'none' : '';
    });
  }

  function setupFirebaseAuthListener() {
    if (authListenerAttached) return;
    const interval = setInterval(() => {
      if (!window._firebaseInitialized || !window.firebaseAuth) return;
      clearInterval(interval);
      window.firebaseAuth.onAuthStateChanged((firebaseUser) => {
        // Clear stale force sign-out flags (avoid mobile bounce)
        localStorage.removeItem('_forceSignOut');
        const userSignedOutIntentionally = localStorage.getItem('_userSignedOutIntentionally') === 'true';

        if (firebaseUser && !userSignedOutIntentionally) {
          cachedFirebaseUser = firebaseUser;
          const localUser = syncLocalUser(firebaseUser);
          updateUIForRole();
          document.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: localUser, authenticated: true } }));
        } else {
          cachedFirebaseUser = null;
          cachedLocalUser = null;
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
          localStorage.removeItem(STORAGE_KEYS.ADMIN_MODE);
          localStorage.setItem('ccrSignedIn', 'false');
          updateUIForRole();
          document.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: null, authenticated: false } }));
        }
      });
      authListenerAttached = true;
    }, 50);
  }

  function signOut({ target = 'signin.html' } = {}) {
    // Clear flags and storage
    localStorage.removeItem('_forceSignOut');
    localStorage.removeItem('_userSignedOutIntentionally');
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_MODE);
    localStorage.setItem('ccrSignedIn', 'false');
    cachedFirebaseUser = null;
    cachedLocalUser = null;
    sessionStorage.clear();
    // Clear IndexedDB auth tokens best-effort
    try {
      indexedDB.deleteDatabase('firebaseLocalStorageDb');
      indexedDB.deleteDatabase('firebase-app-check-database');
    } catch (e) {
      console.warn('IndexedDB clear error (non-blocking):', e);
    }
    if (window.firebaseAuth) {
      window.firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.NONE)
        .then(() => window.firebaseAuth.signOut())
        .finally(() => window.location.replace(target));
    } else {
      window.location.replace(target);
    }
  }

  function updateProfile(updates) {
    const user = getCurrentUser();
    if (!user) return false;
    const updated = { ...user, ...updates, lastSync: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));
    if (updates.role) {
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, updates.role);
    }
    cachedLocalUser = updated;
    return true;
  }

  function setRole(role) {
    if (!Object.values(ROLES).includes(role)) return false;
    return updateProfile({ role });
  }

  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.href = 'index.html?denied=auth';
      return false;
    }
    return true;
  }

  function requireHost() {
    if (!isHost() && !isAdmin()) {
      window.location.href = 'index.html?denied=host';
      return false;
    }
    return true;
  }

  // Init immediately
  setupFirebaseAuthListener();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateUIForRole);
  } else {
    updateUIForRole();
  }

  return {
    ROLES,
    getCurrentUser,
    getFirebaseUser,
    getUserRole,
    isAuthenticated,
    isHost,
    isAdmin,
    isAdminModeEnabled,
    isSpecialAdminUser,
    isOwner,
    signOut,
    updateProfile,
    setRole,
    setAdminModeEnabled,
    updateUIForRole,
    requireAuth,
    requireHost,
    setupFirebaseAuthListener,
  };
})();
