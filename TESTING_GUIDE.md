# CJF Legal Framework - Testing Guide

## 🧪 Testing Checklist

### 1. Safety Popup Test
**Location:** `index.html` or `vehicles.html`

**Steps:**
1. Open the page in browser
2. Wait 0.8 seconds
3. Safety popup should appear automatically
4. Click "I AGREE & CONTINUE"
5. Popup should close and not show again

**Reset Test:**
Open browser console and run:
```javascript
localStorage.removeItem('CJF_SAFETY_POPUP_SHOWN');
```
Then refresh the page - popup should appear again.

---

### 2. Host Signup Agreement Test
**Location:** `host-signup.html`

**Test Cases:**

✅ **Test A: Agreement Required**
1. Fill out all form fields
2. Leave checkbox unchecked
3. Click "Create account"
4. Should show toast: "❌ You must accept the Host Agreement to create an account"
5. Form should NOT submit

✅ **Test B: Password Validation**
1. Fill out all fields
2. Check agreement checkbox
3. Enter different passwords in Password and Confirm Password
4. Click "Create account"
5. Should show toast: "❌ Passwords do not match"

✅ **Test C: Successful Signup**
1. Fill out all fields correctly
2. Check agreement checkbox
3. Enter matching passwords
4. Click "Create account"
5. Should show toast: "✅ Account created successfully! Redirecting..."
6. Should redirect to `host-dashboard.html` after 1.5 seconds
7. Check browser console - should log agreement timestamp

---

### 3. Legal Pages Navigation Test

**Pages to Visit:**
- `/terms.html` - Terms & Conditions
- `/privacy.html` - Privacy Policy
- `/host-agreement.html` - Host Agreement
- `/safety.html` - Safety Guidelines

**Test Each Page:**
1. ✅ Page loads without errors
2. ✅ All sections are visible
3. ✅ Warning boxes are styled correctly (red, yellow, blue)
4. ✅ Footer links work (Terms, Privacy, Host Agreement, Safety)
5. ✅ Mobile responsive (resize browser to 375px width)
6. ✅ All internal links work

---

### 4. Footer Legal Links Test

**Pages with Footer:**
- `index.html`
- `vehicles.html`

**Test:**
1. Scroll to bottom of page
2. Verify footer is visible
3. Click each link:
   - Terms & Conditions → `terms.html`
   - Privacy Policy → `privacy.html`
   - Host Agreement → `host-agreement.html`
   - Safety Guidelines → `safety.html`
   - Contact Support → `contact.html`
4. All links should open correctly

---

### 5. Contact/Reporting Form Test

**Location:** `contact.html`

**Test:**
1. Verify new issue types are available:
   - General Inquiry
   - Report Scam / Fraud
   - Report Fake Listing
   - Report Host
   - Report Renter
   - Technical Issue
   - Account Deletion Request
   - Other
2. Verify scam reporting section is visible
3. Verify warning banner about CJF limitations is displayed

---

## 🔍 Visual Inspection Checklist

### Warning Box Colors:
- 🔴 **Red (#dc3545)** - Critical warnings, scams, fraud
- 🟡 **Yellow (#ffc107)** - Important notices, agreements, caution
- 🔵 **Blue (#0066cc)** - Informational, verification, positive actions
- ⚫ **Gray (#6c757d)** - Disclaimers, platform limitations

### Typography:
- H1: 28-40px (responsive)
- H2: 20-24px
- Body: 14-16px
- Footer: 13-14px

### Spacing:
- Section gaps: 24px
- Card padding: 16-32px
- List line-height: 1.6-1.8

---

## 📱 Mobile Testing

**Test on these breakpoints:**
- 375px (iPhone SE)
- 390px (iPhone 12/13)
- 428px (iPhone 14 Pro Max)
- 768px (iPad)

**Expected Behavior:**
1. Safety popup fits screen, scrollable if needed
2. Legal pages are readable (no horizontal scroll)
3. Footer links stack vertically on mobile
4. Host signup form fields stack on mobile
5. All buttons are touch-friendly (44px minimum)

---

## 🐛 Known Issues / Edge Cases

### Issue 1: Popup on Slow Connections
If page loads slowly, popup might appear before content.
**Solution:** 800ms delay already implemented.

### Issue 2: Multiple Tabs
Opening multiple tabs might show popup multiple times briefly.
**Solution:** localStorage checks on every popup show.

### Issue 3: Private Browsing
Safari private mode doesn't persist localStorage.
**Solution:** Popup will show on every visit in private mode (expected behavior).

---

## ✅ Acceptance Criteria

All tests must pass:

- [ ] Safety popup appears on first visit
- [ ] Safety popup doesn't show on subsequent visits
- [ ] Host agreement checkbox is required
- [ ] Form validates passwords match
- [ ] Agreement timestamp is saved
- [ ] All legal pages load correctly
- [ ] All warning boxes are styled correctly
- [ ] Footer links work on all pages
- [ ] Contact form has new issue types
- [ ] Mobile responsive on all pages
- [ ] No console errors
- [ ] No layout overflow (horizontal scroll)

---

## 🚀 Production Deployment Checklist

Before going live:

1. [ ] Update "Last updated" dates on all legal pages
2. [ ] Verify backend stores `agreementAcceptedAt` timestamp
3. [ ] Test scam reporting workflow
4. [ ] Confirm law enforcement contact procedures
5. [ ] Set up email notifications for critical reports
6. [ ] Document admin procedures for handling reports
7. [ ] Train support staff on legal framework
8. [ ] Review with legal counsel (recommended)
9. [ ] Backup all legal page content
10. [ ] Monitor first 100 user signups for issues

---

## 📊 Analytics to Track

**Metrics to Monitor:**
1. Safety popup dismissal rate
2. Host agreement acceptance rate
3. Drop-off at signup checkbox
4. Scam reports received per week
5. Hosts banned (7-report threshold)
6. Legal page views
7. Contact form submissions by type

---

## 🔧 Developer Notes

### To Add Safety Popup to Other Pages:
Add to `<head>`:
```html
<script src="assets/safetyPopup.js"></script>
```

### To Reset Popup for Testing:
Browser Console:
```javascript
localStorage.removeItem('CJF_SAFETY_POPUP_SHOWN');
location.reload();
```

### To Check Agreement Acceptance:
Browser Console:
```javascript
// After form submission, check:
console.log(JSON.parse(localStorage.getItem('hostData')));
```

### To Disable Popup Temporarily:
Add to page before safetyPopup.js:
```javascript
localStorage.setItem('CJF_SAFETY_POPUP_SHOWN', 'true');
```

---

## 📞 Support Contacts

**For Legal Questions:**
- Review: `/terms.html`, `/privacy.html`, `/host-agreement.html`
- Contact: via `/contact.html` form

**For Technical Issues:**
- Check browser console for errors
- Verify all files are uploaded
- Clear browser cache and try again

---

**Testing Guide Version:** 1.0  
**Last Updated:** December 7, 2025  
**Status:** Ready for QA ✅
