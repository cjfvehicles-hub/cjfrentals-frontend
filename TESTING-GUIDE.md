# 🧪 Security Implementation Test Plan

## Quick Start: Testing the RBAC System

### 1. **Open the Application**
```
Open: index.html in your browser
Expected: Demo auth panel visible in bottom-right corner (purple gradient box)
```

### 2. **Test Guest Access (Default State)**
```
Step 1: Reload page (clear localStorage if needed)
Step 2: Verify you see "👤 Guest (not signed in)" in demo panel
Step 3: Browse index.html, vehicles.html
Expected Results:
  ✓ View vehicle listings - WORKS
  ✓ Click "View Details" on any vehicle - WORKS
  ✓ NO edit buttons visible
  ✓ NO delete buttons visible
  ✓ NO "Add New Vehicle" button visible
  ✓ Contact Host button visible
  ✓ Rent Now button visible
```

### 3. **Test Host Sign In**
```
Step 1: Click "Sign In (Host)" button in demo panel
Step 2: Check browser console - should show "✅ Signed in as Host"
Step 3: Verify demo panel shows "🏠 Host: Premium Car Rental Host"
Expected Results:
  ✓ Green toast notification: "✅ Signed in as Host..."
  ✓ Demo panel updated immediately
  ✓ AuthManager.isHost() returns true in console
```

### 4. **Test Host Can Access Account Page**
```
Step 1: While signed in as Host, click "My Account" in menu
Step 2: Navigate to account.html
Expected Results:
  ✓ Page loads successfully
  ✓ See "My Fleet" section
  ✓ See "Edit Profile" button
  ✓ See "+ Add New Vehicle" button
  ✓ Can edit/delete vehicles
```

### 5. **Test Guest Cannot Access Account Page**
```
Step 1: Click "Sign Out" in demo panel
Step 2: Try to access account.html directly
Step 3: Check page content
Expected Results:
  ✓ Redirected away from account.html
  ✓ See error message: "Access Denied"
  ✓ Automatically redirected to index.html
```

### 6. **Test Backend API Security**
Open browser DevTools (F12) and run these tests:

#### Test 6A: Try to add vehicle WITHOUT auth
```javascript
// In Console:
fetch('http://localhost:3000/api/vehicles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    year: 2023,
    make: 'Tesla',
    model: 'Model 3',
    price: 50,
    frequency: 'Daily'
  })
})
.then(r => r.json())
.then(d => console.log(d))

Expected Response:
{
  "success": false,
  "error": "Authentication required"
}
Status Code: 401
```

#### Test 6B: Add vehicle WITH auth (as host)
```javascript
// First, sign in as host using demo button
// Then run:
fetch('http://localhost:3000/api/vehicles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + AuthManager.getCurrentUser().id
  },
  body: JSON.stringify({
    year: 2024,
    make: 'Tesla',
    model: 'Model S',
    price: 100,
    frequency: 'Daily',
    fuel: 'Electric',
    insurance: 'Included',
    country: 'USA',
    state: 'CA',
    city: 'Los Angeles',
    category: 'Sedan'
  })
})
.then(r => r.json())
.then(d => console.log(d))

Expected Response:
{
  "success": true,
  "message": "Vehicle added successfully",
  "vehicle": { id: ..., year: 2024, ... }
}
Status Code: 200
```

#### Test 6C: Try to edit another host's vehicle
```javascript
// Get a vehicle ID from any existing vehicle
const vehicleId = 1765078664250;  // Use actual ID

// Try to update it (when signed in as different host)
fetch('http://localhost:3000/api/vehicles/' + vehicleId, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + AuthManager.getCurrentUser().id
  },
  body: JSON.stringify({
    price: 999999  // Try to change price
  })
})
.then(r => r.json())
.then(d => console.log(d))

Expected Response (if you don't own it):
{
  "success": false,
  "error": "Permission denied",
  "message": "You can only edit your own vehicles"
}
Status Code: 403
```

---

## Security Verification Checklist

### Frontend Security ✅
- [ ] `auth.js` loaded on all pages
- [ ] `AuthManager.updateUIForRole()` called on page load
- [ ] Account.html has `AuthManager.requireHost()` check
- [ ] Guests see no edit/delete controls
- [ ] Hosts see full control panel
- [ ] Sign in/out works correctly
- [ ] localStorage correctly stores auth state

### Backend Security ✅
- [ ] Authentication middleware installed
- [ ] All write endpoints require Bearer token
- [ ] POST /api/vehicles - requires auth
- [ ] PUT /api/vehicles/:id - requires auth + ownership
- [ ] PATCH /api/vehicles/:id/status - requires auth + ownership
- [ ] DELETE /api/vehicles/:id - requires auth + ownership
- [ ] Returns 401 for missing auth
- [ ] Returns 403 for permission denied
- [ ] hostId cannot be manually overridden by client

### API Integration ✅
- [ ] VehicleStore.js includes auth header
- [ ] getAuthHeader() function works
- [ ] Auth header in Bearer {userId} format
- [ ] All fetch requests include auth header
- [ ] Error responses properly formatted

---

## Common Test Scenarios

### Scenario 1: Guest Browsing
```
1. Open site without logging in
2. Browse index.html, vehicles.html
3. View vehicle details
Expected: Everything visible, no edit controls
```

### Scenario 2: Host Adding Vehicle
```
1. Click "Sign In (Host)" button
2. Navigate to account.html (My Account)
3. Click "+ Add New Vehicle"
4. Fill in vehicle details
5. Save
Expected: Vehicle added to fleet, appears in all lists
```

### Scenario 3: Host Attempting to Edit Other's Vehicle
```
1. Get another host's vehicle ID (e.g., from URL)
2. Try to navigate to edit page
3. Try to make API call with PUT /api/vehicles/{otherId}
Expected: Backend returns 403 Permission Denied
```

### Scenario 4: Admin Access
```
1. Click "Sign In (Admin)" button in demo panel
2. Admin ID is automatically set to 'admin'
3. Can edit ANY vehicle (admin override)
4. Can delete ANY vehicle
Expected: No permission restrictions
```

---

## Debugging Tips

### Check if User is Authenticated
```javascript
// In Console:
console.log('Current User:', AuthManager.getCurrentUser());
console.log('Is Host:', AuthManager.isHost());
console.log('Is Admin:', AuthManager.isAdmin());
console.log('Is Authenticated:', AuthManager.isAuthenticated());
```

### Check Auth Storage
```javascript
// In Console:
console.log('Storage:', {
  user: JSON.parse(localStorage.getItem('CCR_CURRENT_USER')),
  role: localStorage.getItem('CCR_USER_ROLE'),
  token: localStorage.getItem('CCR_AUTH_TOKEN')
});
```

### Test Permission Check
```javascript
// In Console:
const vehicleHostId = 'default-host';  // Some host's ID
console.log('Can edit:', AuthManager.canEditVehicle(vehicleHostId));
console.log('Can delete:', AuthManager.canDeleteVehicle(vehicleHostId));
```

### Clear All Auth Data (Reset to Guest)
```javascript
// In Console:
['CCR_CURRENT_USER', 'CCR_AUTH_TOKEN', 'CCR_USER_ROLE', 'ccrSignedIn'].forEach(key => 
  localStorage.removeItem(key)
);
location.reload();
```

---

## What Should NEVER Happen

### ❌ Security Failures to Avoid
1. ❌ Guest can see "Edit" button on vehicles
2. ❌ Guest can access account.html
3. ❌ Guest can add vehicles to their fleet
4. ❌ Host can edit another host's vehicle
5. ❌ API returns 200 OK for unauthenticated requests to /api/vehicles POST
6. ❌ Vehicle is assigned to wrong host
7. ❌ Deleting vehicle via API without auth succeeds
8. ❌ Anyone can use admin features without being admin
9. ❌ Backend allows changing hostId of existing vehicle
10. ❌ Permission check can be bypassed by removing [data-host-only] attribute

---

## Performance Metrics

### Expected Load Times
- Page load (first time): < 2 seconds
- Vehicle list load: < 1 second
- Auth check: < 100ms
- API request with auth: < 500ms

### Storage Usage
- localStorage auth data: < 1KB
- Session data: < 5KB

---

## Browser Compatibility

✅ Tested & Working:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Note: localStorage must be enabled for auth to work.

---

## Support & Troubleshooting

### Issue: "Authentication required" error
- **Cause:** Missing Authorization header
- **Fix:** Make sure host is signed in before making API calls
- **Verify:** Check `AuthManager.isAuthenticated()` in console

### Issue: "Permission denied" on vehicle edit
- **Cause:** Editing vehicle you don't own
- **Fix:** Sign in as vehicle owner, or sign in as admin
- **Verify:** Check vehicle's hostId matches your user ID

### Issue: "Access Denied" on account.html
- **Cause:** Trying to access as guest
- **Fix:** Sign in as host first using demo button
- **Verify:** Check `AuthManager.isHost()` returns true

### Issue: Edit buttons not showing after sign in
- **Cause:** UI not refreshed
- **Fix:** Call `AuthManager.updateUIForRole()` manually
- **OR:** Reload page with F5

---

**Last Updated:** December 6, 2024  
**Version:** 1.0 - Complete Implementation  
**Status:** ✅ Ready for Testing
