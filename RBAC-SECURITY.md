# 🔒 Role-Based Access Control (RBAC) Implementation Guide

## Overview

This document describes the comprehensive security system implemented for CJF Rentals that controls who can see and edit what content.

---

## User Roles & Permissions

### 1. **Guest / Customer** (Not logged in)
**Visible to:**
- Browse public vehicle listings (only "active" vehicles)
- View vehicle detail pages
- View host public profiles
- Search and filter vehicles
- Read reviews and ratings

**Cannot see:**
- Edit buttons on vehicles
- Delete buttons
- "Add New Vehicle" button
- Host admin tools
- Profile edit buttons
- My Account page (redirected)

---

### 2. **Host** (Logged in, owns vehicles)
**Visible & Accessible:**
- My Account page (protected route)
- My Fleet section with all edit controls
- Edit own vehicles
- Delete own vehicles
- Add new vehicles
- Change vehicle status (active/hidden)
- Edit host profile
- View own vehicles in detail
- Upload vehicle photos

**Cannot do:**
- Edit other hosts' vehicles
- See edit controls for vehicles they don't own
- Access admin features

---

### 3. **Admin** (Full control)
**Visible & Accessible:**
- Everything (like a super-host)
- Can edit any vehicle
- Can delete any vehicle
- Can modify any host profile
- Special admin controls

---

## Frontend Implementation

### Auth Manager Module
**File:** `assets/auth.js`

This module handles all authentication state and permission checks:

```javascript
// Check current user
const user = AuthManager.getCurrentUser();
const isHost = AuthManager.isHost();
const isAdmin = AuthManager.isAdmin();

// Check ownership
const canEdit = AuthManager.canEditVehicle(vehicleHostId);
const canDelete = AuthManager.canDeleteVehicle(vehicleHostId);

// Permission enforcement
AuthManager.requireHost();  // Throws if not host
AuthManager.requireAuth();  // Throws if not logged in
```

### Sign In / Sign Out
```javascript
// Sign in as host
AuthManager.signInAsHost({
  id: 'default-host',
  name: 'John Doe',
  email: 'john@example.com'
});

// Sign out
AuthManager.signOut();
```

### UI Visibility Control
All host-only UI elements must be marked with `data-host-only` attribute:

```html
<!-- Edit buttons (only visible to host) -->
<button class="button" data-host-only id="editVehicleBtn">
  Edit Vehicle
</button>

<!-- Add vehicle button (only visible to host) -->
<button class="button" data-host-only id="addVehicleBtn">
  + Add New Vehicle
</button>

<!-- Delete button (only visible to owner or admin) -->
<button class="button danger" data-host-only id="deleteVehicleBtn">
  Delete
</button>
```

When user signs in/out, `AuthManager.updateUIForRole()` automatically shows/hides these elements.

---

## Backend Security

### Authentication Middleware
All protected endpoints require authorization header:

```
Authorization: Bearer {userId}
```

Example with VehicleStore (automatic):
```javascript
// VehicleStore automatically includes auth header if user is logged in
await VehicleStore.addVehicle(vehicleData);  // Auth header sent automatically
```

### Protected Endpoints

#### POST /api/vehicles (Create)
**Requires:** Authentication
**Effect:** Vehicle assigned to current user (hostId = req.user.id)

```javascript
// Frontend
await VehicleStore.addVehicle({
  year: 2023,
  make: 'Tesla',
  model: 'Model 3',
  // ... other fields
});
// Backend receives: hostId = current_user_id (automatic)
```

#### PUT /api/vehicles/:id (Update)
**Requires:** Authentication + Ownership
**Error if:** User is not vehicle owner AND not admin

```javascript
// Response if user doesn't own vehicle:
{
  "success": false,
  "error": "Permission denied",
  "message": "You can only edit your own vehicles"
}
```

#### DELETE /api/vehicles/:id
**Requires:** Authentication + Ownership
**Error if:** User is not vehicle owner AND not admin

```javascript
// Same permission check as PUT
```

#### PATCH /api/vehicles/:id/status
**Requires:** Authentication + Ownership
**Used for:** Hiding/showing vehicles in public fleet

---

## Visibility Rules

### On Public Pages (Homepage, All Vehicles, Vehicle Detail, Host Profile)

**Guests see:**
- Vehicle cards with image, price, location
- "View Details" button
- Host public profile information
- "Contact Host" button

**Guests do NOT see:**
- Edit button
- Delete button
- Status toggle
- Three-dot menu
- Admin controls
- Fleet management tools

### On My Account / My Fleet (account.html)

**Requirement:** User must be logged in as a host
- If guest tries to access: **Redirected to index.html with "Access Denied" message**
- If host accesses: Full edit controls visible

**Available controls:**
- Edit profile
- Edit vehicle details
- Change vehicle status
- Delete vehicle
- Add new vehicle
- Upload photos
- Danger zone (delete account)

---

## Testing the Security

### Test 1: Guest Cannot See Host Controls
1. Open browser incognito/private window
2. Don't sign in
3. Browse index.html, vehicles.html, vehicle.html, host-profile.html
4. **Result:** No edit buttons, delete buttons, or admin controls visible

### Test 2: Host Cannot Edit Other Vehicles
1. Sign in as Host A
2. Try to manually edit URL to edit Host B's vehicle
3. Backend returns 403 Permission Denied
4. Frontend shows error: "You can only edit your own vehicles"

### Test 3: Unauthorized API Access
1. Try to call `POST /api/vehicles` without Authorization header
2. Backend returns 401: "Authentication required"
3. Try to call `PUT /api/vehicles/123` as different user
4. Backend returns 403: "Permission denied"

### Test 4: Account Page Access Control
1. Guest (not logged in) tries to open account.html
2. **Result:** Redirect to index.html with error message
3. Host logs in, opens account.html
4. **Result:** Full My Account page loads with all controls

---

## Data Storage

### Local Storage Keys (Frontend)
```javascript
'CCR_CURRENT_USER'      // Current logged-in user object
'CCR_AUTH_TOKEN'        // Auth token (if needed)
'CCR_USER_ROLE'         // User role: 'guest', 'host', 'admin'
'CCR_VEHICLES_CACHE'    // Offline cache of vehicles
'ccrSignedIn'           // Legacy compatibility flag
```

### Backend Database
All vehicles stored with `hostId` field:
```json
{
  "id": 1765078664250,
  "hostId": "default-host",
  "make": "Nissan",
  "model": "Sentra",
  "status": "active"
}
```

When user modifies vehicle:
```
User ID in Authorization header === vehicle.hostId → Allow
User ID in Authorization header !== vehicle.hostId → Deny (403)
```

---

## Implementation Checklist

### Frontend
- ✅ Create `assets/auth.js` with AuthManager module
- ✅ Add `<script src="assets/auth.js"></script>` to all pages
- ✅ Mark host-only elements with `data-host-only`
- ✅ Call `AuthManager.updateUIForRole()` on page load
- ✅ Protect account.html with `AuthManager.requireHost()`
- ✅ Hide edit/delete controls on public pages

### Backend
- ✅ Add `requireAuth` middleware
- ✅ Add `isOwner()` and `isAdmin()` checks
- ✅ Protect POST /api/vehicles endpoint
- ✅ Protect PUT /api/vehicles/:id endpoint
- ✅ Protect DELETE /api/vehicles/:id endpoint
- ✅ Protect PATCH /api/vehicles/:id/status endpoint
- ✅ Return proper error messages (401, 403)

### VehicleStore
- ✅ Extract auth header from AuthManager
- ✅ Include `Authorization: Bearer {userId}` in all requests
- ✅ Handle 401/403 responses gracefully

---

## Security Best Practices

### 1. Never Trust Frontend Alone
- Hiding a button is NOT security
- Backend MUST verify permissions
- Frontend hides controls for UX, backend enforces rules for security

### 2. Always Check Ownership
```javascript
// WRONG - Just check if logged in
if (req.user) { /* allow delete */ }

// RIGHT - Check if owner or admin
if (isOwner(req.user, vehicle.hostId) || isAdmin(req)) { /* allow */ }
```

### 3. Return Proper Status Codes
- **200 OK** - Success
- **400 Bad Request** - Validation error
- **401 Unauthorized** - Not logged in
- **403 Forbidden** - Logged in but no permission
- **404 Not Found** - Resource doesn't exist
- **500 Server Error** - Server issue

### 4. Log Security Events
```javascript
console.log(`✅ Vehicle created by user ${req.user.id}`);
console.log(`⚠️ Unauthorized delete attempt by user ${req.user.id} on vehicle ${vehicleId}`);
```

### 5. Validate All Inputs
```javascript
// Check required fields
const missingFields = requiredFields.filter(field => !data[field]);
if (missingFields.length > 0) {
  return res.status(400).json({ error: 'Missing required fields' });
}

// Check data types
if (typeof data.price !== 'number' || data.price < 0) {
  return res.status(400).json({ error: 'Invalid price' });
}
```

---

## Future Enhancements

1. **JWT Tokens** - Replace bearer token with JWT for stateless auth
2. **Session Management** - Track active sessions
3. **Two-Factor Auth** - Extra security for accounts
4. **Audit Log** - Track all modifications
5. **Rate Limiting** - Prevent brute force attacks
6. **IP Whitelisting** - Restrict access by IP
7. **Encryption** - Encrypt sensitive data in transit and at rest

---

## Support & Debugging

### Common Issues

**Issue:** "Access Denied" message on account.html
**Solution:** Sign in first. Guest users cannot access host-only pages.

**Issue:** Edit button not visible
**Reason:** You're either not signed in, or viewing someone else's vehicle.
**Solution:** Sign in as the owner of the vehicle.

**Issue:** API returns 403 Permission Denied
**Reason:** You're trying to edit/delete a vehicle you don't own.
**Solution:** Only owners or admins can modify vehicles.

**Issue:** API returns 401 Unauthorized
**Reason:** Authorization header missing or invalid.
**Solution:** Make sure you're signed in (check `AuthManager.isAuthenticated()`).

---

**Last Updated:** December 6, 2024  
**Status:** ✅ Implemented and Tested
