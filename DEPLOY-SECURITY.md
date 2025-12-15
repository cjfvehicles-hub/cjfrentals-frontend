# Production Security Deployment Checklist

## Overview
This document covers finalizing the security hardening deployment to production:
- Publish updated Firestore rules
- Configure Cloud Run environment variables
- Verify deployments

## 1. Deploy Firestore Rules

### Option A: Firebase Console (easiest)
1. Open [Firebase Console](https://console.firebase.google.com) → Firestore → Rules
2. Copy contents of `firestore.rules` from your project
3. Paste into the online editor
4. Click **Publish**

### Option B: Firebase CLI
```bash
# Install if needed
npm install -g firebase-tools

# Authenticate
firebase login

# Deploy from your project root
firebase deploy --only firestore:rules
```

**Verification:**
- Go to Firestore in Firebase Console
- Verify the rule set includes `isServerServiceAccount()` function
- Confirm `reviewTokens/*` and `contactReports/*` are server-only write

---

## 2. Configure Cloud Run Environment Variables

Your Cloud Run service: `cjf-api` (region: `us-east1`)

### Required environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `FIREBASE_SERVICE_ACCOUNT_B64` | base64 of serviceAccountKey.json | Keep secret; do not commit |
| `ALLOWED_ORIGINS` | https://cjfrentals.com, https://YOUR-SITE.netlify.app | Comma-separated |
| `ALLOWED_HOSTS` | cjfrentals.com, YOUR-SITE.netlify.app, www.cjfrentals.com | Comma-separated |
| `REQUIRE_FORWARDED_HOST` | true | Block direct Cloud Run hits |
| `ALLOW_UID_BEARER` | false | Disable dev mode; require Firebase ID tokens |
| `ENABLE_HSTS` | true | Enforce HTTPS |
| `ADMIN_EMAIL` | cjfvehicles@gmail.com | Admin detection |

### Via Google Cloud Console:
1. Go to [Cloud Run](https://console.cloud.google.com/run)
2. Click service `cjf-api`
3. Click **Edit & Deploy New Revision**
4. Scroll to **Environment variables** section
5. Add/update each variable from table above
6. Click **Deploy**

### Via gcloud CLI:
```bash
gcloud run deploy cjf-api \
  --region=us-east1 \
  --set-env-vars=\
FIREBASE_SERVICE_ACCOUNT_B64=$(cat server/serviceAccountKey.json | base64),\
ALLOWED_ORIGINS="https://cjfrentals.com,https://YOUR-SITE.netlify.app",\
ALLOWED_HOSTS="cjfrentals.com,YOUR-SITE.netlify.app,www.cjfrentals.com",\
REQUIRE_FORWARDED_HOST=true,\
ALLOW_UID_BEARER=false,\
ENABLE_HSTS=true,\
ADMIN_EMAIL="cjfvehicles@gmail.com"
```

---

## 3. Verify Deployments

### Firestore Rules
- Test that a web client cannot write to `reviewTokens/*` (should fail with permission error)
- Test that server-side write succeeds (via backend endpoint)

### Cloud Run Origin Enforcement
```bash
# Should fail with 403 (unauthorized origin)
curl -X GET https://cjf-api-XXXX.us-east1.run.app/api/health \
  -H "Origin: https://untrusted.com" \
  -H "Host: untrusted.com"

# Should succeed via Netlify proxy
curl -X GET https://YOUR-SITE.netlify.app/api/health
```

### Firebase ID Token Auth
- Sign in on the live site
- Open DevTools → Network → filter for `/api/vehicles`
- Verify `Authorization: Bearer eyJ...` header is present
- Verify endpoint succeeds with 200

---

## 4. Post-Deployment Checklist

- [ ] Firestore rules published
- [ ] Cloud Run env vars set and service redeployed
- [ ] Test sign-in flow on live site
- [ ] Test vehicle creation (POST /api/vehicles) as signed-in host
- [ ] Verify direct Cloud Run calls are blocked (403)
- [ ] Monitor Cloud Run logs for suspicious attempts
- [ ] Rotate local serviceAccountKey.json (delete from disk; use only env var)

---

## Troubleshooting

### "Unauthorized domain" error on sign-in
- Ensure your domain is in Firebase Console → Authentication → Settings → Authorized domains
- Add both custom domain AND Netlify domain

### 403 Forbidden on /api calls from site
- Verify `ALLOWED_ORIGINS` and `ALLOWED_HOSTS` include your domain
- Check that Netlify proxy in `netlify.toml` is forwarding `/api/*` correctly

### Review submission fails with 500
- Verify Cloud Run has valid `FIREBASE_SERVICE_ACCOUNT_B64`
- Check Cloud Run logs: `gcloud run logs read cjf-api --limit 50`
- Ensure Firestore service account has `roles/editor` or at minimum write permissions

---

## Questions?
If deployments fail or you see errors, share:
1. The exact error message
2. The Cloud Run service revision number (e.g., `cjf-api-00010-abc`)
3. Any Cloud Run logs output

