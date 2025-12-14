# Testing Persistent Authentication - Quick Checklist

## ✅ Test 1: Sign-In Persistence (Basic)
**What we're testing:** Does sign-in state persist across page navigation?

```
1. Visit cjfrentals.com (should show "Sign In" button)
2. Click Sign In → sign in with test email/password
3. Wait for redirect to account.html
4. CHECK: Header shows "My Account" ✓ and "Sign Out" ✓
5. Open browser console (F12)
6. VERIFY: See log "✅ Firebase Auth persistence enabled (LOCAL)"
7. VERIFY: See log "🔐 Firebase Auth state changed: [uid]"
```

**Status:** PASS / FAIL

---

## ✅ Test 2: Cross-Page Navigation
**What we're testing:** Does the logged-in state persist when navigating?

```
After signing in:

1. Click "Home" in menu
   → Verify header shows "My Account" ✓
   → Verify header shows "Sign Out" ✓
   
2. Click "Browse Vehicles" in menu
   → Verify header shows "My Account" ✓
   → Verify header shows "Sign Out" ✓
   
3. Click "Become a Host" in menu
   → Verify header shows "My Account" ✓
   → Verify header shows "Sign Out" ✓
   
4. Click "My Account" in menu
   → Verify page loads with your profile ✓
   → Verify header shows "My Account" ✓

5. Open browser console
   VERIFY: Only ONE "🔐 Firebase Auth state changed" message
   (NOT one per page - that would be a problem)
```

**Status:** PASS / FAIL

---

## ✅ Test 3: Session Persistence Across Browser Restart
**What we're testing:** Does login survive browser closure?

```
1. Sign in successfully
2. Verify header shows "My Account" ✓
3. Open DevTools (F12) → Application → Local Storage
4. Find entry: "CJF_CURRENT_USER"
5. Note its value (should have your uid and email)
6. **COMPLETELY CLOSE THE BROWSER** (or all tabs on domain)
7. Reopen cjfrentals.com in a NEW browser window
8. VERIFY: Header IMMEDIATELY shows "My Account" ✓
   (WITHOUT needing to sign in again)
9. Open console
   VERIFY: See "🔐 Firebase Auth state changed: [uid]" (Firebase restored session)
10. Open DevTools → Application → Local Storage
11. VERIFY: "CJF_CURRENT_USER" entry is still there
```

**Status:** PASS / FAIL

---

## ✅ Test 4: Sign-Out Functionality
**What we're testing:** Does sign-out work everywhere?

```
1. While logged in, click "Sign Out"
2. VERIFY: Header shows "Sign In" ✓
3. VERIFY: No "My Account" option visible ✓
4. VERIFY: No "Sign Out" option visible ✓
5. Open DevTools → Application → Local Storage
6. VERIFY: "CJF_CURRENT_USER" is GONE
7. Try to visit /account.html directly
8. VERIFY: Either redirected to home or signin overlay appears
9. Open console
   VERIFY: See appropriate sign-out logs
```

**Status:** PASS / FAIL

---

## ✅ Test 5: Multi-Tab Session Sharing
**What we're testing:** Does Firebase auth work across multiple tabs?

```
Tab A:
1. Sign in on Tab A
2. Verify header shows "My Account" ✓

Tab B:
3. Open NEW TAB and go to cjfrentals.com
4. VERIFY: Header IMMEDIATELY shows "My Account" ✓
   (Because both tabs share browser's Firebase session)
5. VERIFY: Don't need to sign in again

Tab A again:
6. Click "Sign Out"
7. VERIFY: Tab A header now shows "Sign In" ✓

Back to Tab B:
8. **Refresh Tab B** (F5)
9. VERIFY: Now Tab B also shows "Sign In" ✓
   (Firebase session is gone, so both tabs reflect it)
```

**Status:** PASS / FAIL

---

## ✅ Test 6: Console Logging
**What we're testing:** Are we seeing the right logs?

**Open browser console (F12) and look for:**

```
✅ Firebase initialized
✅ Firebase Auth persistence enabled (LOCAL)
📡 Attaching Firebase Auth listener...
🔐 Firebase Auth state changed: [your-uid]
✅ Firebase user synced to localStorage: {...}
🎨 Updating UI for role: {authenticated: true, host: true, admin: false}
```

**Note:** You should see these logs ONCE when the page loads with cached auth, then only again if you sign in/out.

**Status:** PASS / FAIL / NEED TO CHECK

---

## ✅ Test 7: Private Browsing (Edge Case)
**What we're testing:** Does localStorage work in private browsing?

```
1. Open cjfrentals.com in PRIVATE/INCOGNITO window
2. Sign in
3. Verify header shows "My Account" ✓
4. Navigate around
5. Verify state persists ✓
6. Close private window
7. Reopen private window
8. VERIFY: Header shows "Sign In" again
   (Private browsing clears localStorage on exit - expected)
```

**Status:** PASS / FAIL

---

## ✅ Test 8: Account Page Auth Gate
**What we're testing:** Can unauthenticated users access /account.html?

```
1. Make sure you're SIGNED OUT
2. Try to visit /account.html directly
3. VERIFY: Either:
   a) Redirected to home page, OR
   b) Signin overlay appears, OR
   c) Content is hidden
4. Sign in
5. VERIFY: /account.html now loads with your profile
```

**Status:** PASS / FAIL

---

## 🔍 Debugging Commands (Run in Browser Console)

```javascript
// Check Firebase Auth state
window.firebaseAuth.currentUser

// Check localStorage state
JSON.parse(localStorage.getItem('CJF_CURRENT_USER'))

// Check AuthManager state
AuthManager.isAuthenticated()
AuthManager.isHost()
AuthManager.getCurrentUser()

// Check Firebase initialization
window.firebaseApp
window.firebaseAuth
window.firebaseDb

// Force update UI
AuthManager.updateUIForRole()

// Sign out programmatically (for testing)
AuthManager.signOut({redirect: true})
```

---

## 🚨 If Something Fails

### "Sign In button still shows after signing in"
- [ ] Check console for Firebase errors
- [ ] Verify `.menu-signin`, `.menu-logout` elements exist in HTML
- [ ] Check if `updateUIForRole()` is being called
- [ ] Clear browser cache and try again
- [ ] Check Firefox/Chrome DevTools Storage → cookies (look for Firebase session)

### "Logged out on one page but not another"
- [ ] This suggests `setupFirebaseAuthListener()` didn't attach properly
- [ ] Check console for "Firebase not loaded" or "persistence error" messages
- [ ] Check that `auth.js` is loaded on ALL pages
- [ ] Try hard refresh (Ctrl+Shift+R)

### "Private browsing shows different behavior"
- [ ] localStorage is limited in private browsing
- [ ] Firefox: localStorage blocked in private mode by default
- [ ] This is OK - sign-in still works, just doesn't persist on exit

### "Sign out doesn't clear localStorage"
- [ ] Should be cleared by `signOut()` function
- [ ] Check console for errors during sign out
- [ ] Manually clear using DevTools if needed

---

## ✅ Final Validation

Run through this checklist to confirm everything works:

- [ ] Sign in works
- [ ] Header shows "My Account" after sign in
- [ ] Navigation keeps logged-in state
- [ ] Browser restart keeps logged-in state
- [ ] Sign out works
- [ ] Header shows "Sign In" after sign out
- [ ] Console shows expected log messages
- [ ] No redirect loops
- [ ] No "sometimes asks to sign in" behavior
- [ ] Multi-tab works (auth shared)

**Overall Status:** ✅ PASS / ❌ FAIL

---

## Summary Table

| Test | Result | Notes |
|------|--------|-------|
| Basic Sign-In | ✓/✗ | |
| Cross-Page Nav | ✓/✗ | |
| Browser Restart | ✓/✗ | |
| Sign-Out | ✓/✗ | |
| Multi-Tab | ✓/✗ | |
| Console Logs | ✓/✗ | |
| Private Browse | ✓/✗ | |
| Account Auth Gate | ✓/✗ | |

If all tests are ✓, the persistent authentication fix is working correctly!
