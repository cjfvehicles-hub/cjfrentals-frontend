# Development Workflow & Deployment Guide

## Table of Contents
1. [Version Control](#version-control)
2. [Branching Strategy](#branching-strategy)
3. [Environments](#environments)
4. [Making Changes](#making-changes)
5. [Deployment](#deployment)
6. [Rollback Procedure](#rollback-procedure)

---

## Version Control

All code changes must go through Git. **Never edit files directly on the live server.**

### Setting Up Git

```bash
# Initialize repo (if not already)
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit: CCR vehicle rental platform"

# Add remote (replace with your repo)
git remote add origin https://github.com/clyderoccr-beep/clyderocashcarrental.git

# Push to main
git push -u origin main
```

### Git Configuration

```bash
# Set your identity
git config user.name "Your Name"
git config user.email "your.email@example.com"

# View config
git config --list
```

---

## Branching Strategy

Use **feature branches** + main deployment branch.

### Branch Naming Convention

```
main                          # Production ready
  ├─ feature/auth-fix         # New feature
  ├─ bugfix/menu-sync         # Bug fix
  ├─ refactor/vehicle-cache   # Code cleanup
  └─ docs/update-readme       # Documentation
```

### Creating & Using Branches

```bash
# Create a new feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "Clear commit message describing what changed"

# Push to remote
git push origin feature/my-feature

# Create Pull Request (PR) on GitHub
# → Code review → Merge to main

# After merging, delete the branch
git branch -d feature/my-feature
```

### Commit Message Template

```
<type>: <subject>

<body>

<footer>
```

Example:
```
fix: menu not updating after login

- Added click handler to .menu-signin
- Now triggers ccr:signedIn event immediately
- Menu syncs across all pages without reload

Fixes #42
```

Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring without behavior change
- `perf:` - Performance improvement
- `docs:` - Documentation only
- `test:` - Tests only
- `chore:` - Maintenance, tooling, etc.

---

## Environments

### Environment Setup

#### 1. **Local Development** (Your Computer)
```
http://localhost:8000
```
- Use this for all development
- Test features here first
- Use `npm run dev` if available

#### 2. **Staging** (Test Server)
```
https://test.clyderoccr.com
```
- Mirrors production setup
- All changes go here first
- QA/testing team validates
- Can be publicly visible or internal-only

#### 3. **Production** (Live)
```
https://www.clyderoccr.com
```
- Only stable, tested code
- All users see this
- Changes only after staging approval

### Environment Variables

Create `.env` files for each environment:

**`.env.local`** (local development):
```
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENV=development
```

**`.env.staging`** (test server):
```
REACT_APP_API_URL=https://api-staging.clyderoccr.com
REACT_APP_ENV=staging
```

**`.env.production`** (live):
```
REACT_APP_API_URL=https://api.clyderoccr.com
REACT_APP_ENV=production
```

Load environment:
```bash
# For local dev
npm run dev

# For staging
ENV=staging npm run build

# For production
ENV=production npm run build
```

---

## Making Changes

### Step 1: Create Feature Branch

```bash
git checkout -b feature/my-new-feature
```

### Step 2: Make Changes

Edit files as needed.

### Step 3: Test Locally

```bash
# Start local dev server
npm run dev

# Or open HTML files directly in browser
# Open: file:///path/to/index.html

# Run regression tests (TESTING.md)
# ✓ Sign in / sign out works
# ✓ Add vehicle works
# ✓ Menu syncs across pages
# etc.
```

### Step 4: Commit Changes

```bash
# Stage changes
git add .

# Commit with clear message
git commit -m "feat: add vehicle gallery lightbox

- Adds fullscreen image viewer
- Keyboard navigation (arrow keys, ESC)
- Accessible (ARIA labels)

Closes #123"

# Commit again if needed
git add src/gallery.js
git commit -m "refactor: extract gallery to separate module"
```

### Step 5: Push & Create PR

```bash
# Push to remote
git push origin feature/my-new-feature

# On GitHub/GitLab: Create Pull Request
# - Describe what changed
# - Link to issue #123
# - Request review
```

### Step 6: Code Review

- Team member reviews changes
- Discussion/suggestions in PR
- Make updates if needed:
  ```bash
  git add .
  git commit -m "feedback: address review comments"
  git push origin feature/my-new-feature
  ```

### Step 7: Merge to Main

Once approved:

```bash
# Locally, switch to main
git checkout main

# Pull latest
git pull origin main

# Merge feature branch
git merge feature/my-new-feature

# Push to remote
git push origin main

# Delete local branch
git branch -d feature/my-new-feature
```

Or merge via GitHub UI → "Squash and merge" for cleaner history.

---

## Deployment

### Deploying to Staging

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Build for staging
ENV=staging npm run build

# Deploy to staging server
# (Your hosting provider's method)
# Examples:
#   - scp dist/* user@test.clyderoccr.com:/var/www/
#   - git push heroku main:main
#   - Click "Deploy" in Netlify dashboard

# Verify on https://test.clyderoccr.com
# Run full TESTING.md checklist
```

### Deploying to Production

Only after staging is verified:

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Build for production
ENV=production npm run build

# Deploy to production
# Examples:
#   - scp dist/* user@www.clyderoccr.com:/var/www/
#   - git push heroku main:main
#   - Click "Deploy" in Netlify dashboard

# Verify on https://www.clyderoccr.com
# Run critical tests quickly
```

### Post-Deployment Checklist

- [ ] Site loads without errors
- [ ] Sign in / sign out works
- [ ] Check browser console for errors
- [ ] Mobile looks correct
- [ ] Images load properly
- [ ] Database/API calls working

---

## Rollback Procedure

If something breaks on production:

### Option 1: Revert Last Commit

```bash
# See recent commits
git log --oneline -5

# Find the bad commit (most recent)
# Revert it (creates a new commit that undoes it)
git revert <commit-hash>

# Push to trigger new deployment
git push origin main
```

### Option 2: Rollback to Previous Version

If you need to go back further:

```bash
# Find the last known good commit
git log --oneline

# Create a rollback branch
git checkout -b rollback/<good-commit-hash> <good-commit-hash>

# Force push to main (⚠️ ONLY if safe & no one else is pushing)
git push -f origin main

# Document what happened
# Update CHANGELOG.md with incident notes
```

### Document the Incident

Update `CHANGELOG.md`:

```markdown
## [Rollback 2025-12-07]

### Rolled Back
- v1.2.0 had a critical auth bug

### Reverted To
- v1.1.0 (last known good)

### What Went Wrong
- Menu sync event not firing in certain browsers
- Caused infinite redirect loop on account page

### Root Cause
- Missing error handling in `ccr:signedIn` listener

### Next Steps
- Fix the root cause on feature branch
- Test thoroughly before re-merging
```

---

## Dependency Management

### Lock All Dependencies

In `package.json`, use exact versions (no `^` or `~`):

```json
{
  "dependencies": {
    "express": "4.18.2",        // ✓ Exact version
    "axios": "1.4.0",           // ✓ Exact version
    "react": "18.2.0"           // ✓ Exact version
  },
  "devDependencies": {
    "webpack": "5.88.0",        // ✓ Exact version
    "eslint": "8.49.0"          // ✓ Exact version
  }
}
```

### Upgrading a Library

```bash
# Create feature branch
git checkout -b chore/update-axios

# Upgrade specific package
npm install axios@latest --save

# Test thoroughly
npm test

# Commit
git commit -m "chore: upgrade axios from 1.4.0 to 1.6.0"

# Push & merge via PR
```

---

## Checklist: Before Every Deployment

- [ ] All changes in feature branches (not direct to main)
- [ ] Code reviewed (if team)
- [ ] TESTING.md checklist passed on staging
- [ ] CHANGELOG.md updated with version & changes
- [ ] No console errors on desktop & mobile
- [ ] Performance acceptable (< 3s page load)
- [ ] `.gitignore` excludes node_modules, .env, etc.
- [ ] Commit messages are clear
- [ ] No sensitive data in git (API keys, passwords, etc.)

---

## Quick Reference: Common Commands

```bash
# Check status
git status

# See recent commits
git log --oneline -10

# Switch branch
git checkout branch-name

# Create & switch to new branch
git checkout -b feature/name

# Undo unstaged changes
git checkout .

# Undo last commit (keep changes)
git reset --soft HEAD~1

# View differences before committing
git diff

# Stash changes temporarily
git stash
git stash pop  # Restore later
```

---

## Questions?

For detailed info on any Git command:
```bash
git help <command>
# e.g., git help commit
```

Always test on staging first. **Never force-push to main.** When in doubt, create a feature branch.
