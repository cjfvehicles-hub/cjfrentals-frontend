# Testing & QA Checklist

## Critical User Flows

All changes must pass these regression tests before deployment.

### 1. Authentication Flow

- [ ] **Sign In** - Click "Sign In" from hamburger menu
  - Menu shows "My Account" and "Sign Out" immediately
  - Can click "My Account" to go to account page
  - Page reloads → menu still shows logged-in state
  
- [ ] **Sign Out** - Click "Sign Out" from hamburger menu
  - Redirected to home page
  - Menu shows "Sign In" again
  - localStorage auth keys are cleared
  - All pages show logged-out menu after refresh

- [ ] **Cross-Page Auth State**
  - Sign in on home page
  - Navigate to vehicles.html
  - Menu shows logged-in state (no second click needed)
  - Sign out on vehicles page
  - Go to account.html
  - Menu shows signed-out state

### 2. Vehicle Management

- [ ] **View Vehicle List**
  - Home page loads and displays featured vehicles
  - vehicles.html shows all active vehicles
  - Vehicle cards have correct: image, make/model, price, location

- [ ] **View Vehicle Detail**
  - Click a vehicle card
  - vehicle.html loads with correct details
  - Gallery displays multiple images
  - Host profile link works

- [ ] **Add Vehicle (Logged In)**
  - Sign in
  - Go to account.html
  - Click "Add Vehicle"
  - Fill form and save
  - Vehicle appears in "My Fleet"
  - Vehicle appears in public fleet (if Active)

- [ ] **Edit Vehicle**
  - Go to My Fleet
  - Click Edit on a vehicle
  - Modify details and save
  - Changes persist (reload page)

- [ ] **Delete Vehicle**
  - Go to My Fleet
  - Click Delete on a vehicle
  - Vehicle is removed from My Fleet
  - Vehicle no longer in public fleet

### 3. Plan & Limits

- [ ] **Plan Display**
  - Account page shows current plan (e.g., "5 Vehicle Plan")
  - Shows vehicles used / limit (e.g., "2 / 5")

- [ ] **Plan Enforcement**
  - When at plan limit, "Add Vehicle" button is disabled or shows upgrade prompt
  - Can't exceed plan limit by adding vehicles

- [ ] **Plan Upgrade**
  - Click "Upgrade Plan"
  - Can select new plan
  - Plan changes and limit increases

### 4. Host Profiles

- [ ] **Host Profile (Public)**
  - View host profile from vehicle page
  - Shows host avatar, name, rating, fleet count
  - Lists host's active vehicles
  - Works without being logged in

- [ ] **Host Profile (Private/Account)**
  - When logged in, can edit profile
  - Can upload avatar and cover photo
  - Changes persist

### 5. Data Persistence

- [ ] **localStorage Keys Cleanup**
  - After sign out, check browser DevTools > Application > localStorage
  - All auth keys (`CCR_CURRENT_USER`, `CCR_AUTH_TOKEN`, `CCR_USER_ROLE`, `ccrSignedIn`) are removed
  - Only app-safe keys remain (vehicle cache, settings, etc.)

- [ ] **Vehicle Cache**
  - vehicles.html loads without "QuotaExceededError"
  - Vehicle data loads from backend and caches properly
  - Can reload page and see cached data if offline

## Browser / Device Testing

- [ ] **Desktop** (Chrome, Firefox, Safari, Edge)
- [ ] **Mobile** (iOS Safari, Chrome Mobile)
  - Menu toggle works
  - All buttons are tappable (min 44px)
  - Images load properly

## Performance

- [ ] **Page Load Time**
  - Home page: < 2 seconds
  - vehicles.html: < 2 seconds
  - vehicle.html: < 3 seconds (includes vehicle + host profile data)

- [ ] **No Console Errors**
  - Open DevTools > Console
  - No red error messages after page load
  - No "Uncaught" exceptions

## Automated Test Commands (when available)

```bash
# Unit tests
npm test

# UI/Integration tests (Cypress/Playwright)
npm run test:ui

# Regression test checklist
npm run test:regression
```

## Pre-Deployment Checklist

Before pushing to live (www.clyderoccr.com):

- [ ] All tests pass
- [ ] All critical flows work on staging (test.clyderoccr.com)
- [ ] No console errors on desktop and mobile
- [ ] Performance acceptable
- [ ] Changelog updated
- [ ] Commit message is clear
- [ ] Code reviewed (if team)
- [ ] CHANGELOG.md updated with version bump

## Rollback Procedure

If something breaks on live:

1. Check git log for recent changes:
   ```bash
   git log --oneline -10
   ```

2. Find the last known good commit
3. Rollback:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

4. OR checkout previous version:
   ```bash
   git checkout <last-good-commit>
   git push -f origin main  # CAREFUL: force push only if safe
   ```

5. Document the issue and what was rolled back in CHANGELOG.md
