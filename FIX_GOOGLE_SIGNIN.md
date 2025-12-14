# Fix: Google Sign-In Failed

## The Problem
Firebase is blocking Google sign-in because your domain isn't authorized.

## Solution (5 minutes)

### Step 1: Enable Google Sign-In in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select **cjf-rentals** project
3. Go to **Authentication** (left sidebar)
4. Click **Sign-in method** tab
5. Find **Google** → Click it
6. Toggle **Enable** (top-right)
7. Select project support email
8. Click **Save**

### Step 2: Add Your Domain to Authorized Domains

**Still in Firebase Console:**

1. Go to **Authentication** → **Settings** tab
2. Scroll down to **Authorized domains**
3. Click **Add domain**
4. Add these domains:
   - `localhost` (for local testing)
   - `127.0.0.1` (for localhost IP)
   - `cjfrentals.com` (your production domain)
   - Any other domain you're using

5. Click **Add**

### Step 3: Test Locally

1. Clear browser cache: `Ctrl+Shift+Del`
2. Go to: http://127.0.0.1:1500/signin.html
3. Click **"Sign in with Google"**
4. Should now work! ✅

## Common Fixes

| Error | Solution |
|-------|----------|
| Popup blocked | Check browser popup settings |
| CORS error | Domain not in authorized list |
| 403 Forbidden | Google Sign-In not enabled |
| Invalid Client ID | Re-enable Google Auth method |

## After Deployment

When you deploy to production (cjfrentals.com):
1. Repeat Step 2 above
2. Add `cjfrentals.com` to authorized domains
3. Google sign-in will work on production too

---

**Need help?** Check Firebase console → Authentication → Settings for detailed error messages.
