# CJF - Global Peer-to-Peer Vehicle Rental Platform

A modern web platform for peer-to-peer vehicle rentals with host management, vehicle fleet operations, and subscription-based plan system.

## Quick Links

- **Live Site**: https://www.clyderoccr.com
- **Test/Staging**: https://test.clyderoccr.com
- **Development Guide**: [DEVELOPMENT.md](DEVELOPMENT.md)
- **Testing Guide**: [TESTING.md](TESTING.md)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

## Getting Started

### Local Development

```bash
# Clone the repository
git clone https://github.com/clyderoccr-beep/clyderocashcarrental.git
cd "World Rental"

# Start local dev server
npm run dev

# Open in browser
# http://localhost:8000
```

### Key Features

- **Vehicle Browsing** - Browse and search vehicles globally
- **Host Management** - Manage fleet, profile, and vehicle listings
- **Plan System** - Subscription plans with vehicle limits
- **Public Profiles** - View host profiles and vehicle details
- **Authentication** - Secure sign in/out with persistent session
- **Responsive Design** - Works on desktop, tablet, and mobile

## Project Structure

```
.
├── index.html              # Home page
├── account.html            # Host account & fleet management
├── vehicle.html            # Vehicle detail page
├── vehicles.html           # Browse all vehicles
├── host-*.html             # Host-related pages
├── contact.html            # Contact page
├── terms.html              # Terms & conditions
├── assets/
│   ├── auth.js             # Authentication system (AuthManager)
│   ├── vehicleStore.js     # Vehicle data management (VehicleStore)
│   ├── style.css           # Global styles
│   └── account.css         # Account page styles
├── assets - Copy/          # Vehicle images
├── server/                 # Backend Node.js server
│   ├── server.js           # Express server
│   └── package.json        # Backend dependencies
├── DEVELOPMENT.md          # Development workflow guide
├── TESTING.md              # QA & testing checklist
├── CHANGELOG.md            # Version history
└── package.json            # Project metadata

```

## Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes** and test locally (`npm run dev`)

3. **Commit with clear messages**
   ```bash
   git add .
   git commit -m "feat: describe what changed"
   ```

4. **Push and create a Pull Request**
   ```bash
   git push origin feature/my-feature
   ```

5. **Code review** → Approve → Merge to main

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed workflow.

## Testing

All critical flows must be tested before deployment:

- Authentication (sign in, sign out, cross-page sync)
- Vehicle management (add, edit, delete, view)
- Plan enforcement (limits, upgrades)
- Host profiles (public and private)
- Data persistence
- Browser/device compatibility

See [TESTING.md](TESTING.md) for full regression checklist.

## Deployment

### To Staging
```bash
git checkout main
git pull origin main
npm run build:staging
# Deploy to https://test.clyderoccr.com
# Run full TESTING.md checklist
```

### To Production
```bash
git checkout main
git pull origin main
npm run build:production
# Deploy to https://www.clyderoccr.com
# Verify critical tests pass
```

See [DEVELOPMENT.md#deployment](DEVELOPMENT.md#deployment) for detailed steps.

## Rollback

If production breaks:

```bash
# Revert last commit
git revert <commit-hash>
git push origin main

# OR rollback to previous version
git checkout -b rollback/<previous-version>
git push -f origin main
```

Document the incident in CHANGELOG.md.

## Key Technologies

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js, Express
- **Storage**: Browser localStorage, Backend database
- **Hosting**: (Your provider)

## Architecture

### Authentication (AuthManager)

- Centralized auth state management
- localStorage for persistence
- Global events for UI sync: `ccr:signedIn`, `ccr:signedOut`
- Role-based access control (guest, host, admin)

### Vehicle Management (VehicleStore)

- Single source of truth for vehicle data
- Backend synchronization
- Local caching with size optimization
- Support for vehicle state: active, hidden, draft

## API Endpoints

Backend server provides REST API:

```
GET    /vehicles              # Get all active vehicles
GET    /vehicles/:id          # Get vehicle details
POST   /vehicles              # Create new vehicle
PUT    /vehicles/:id          # Update vehicle
DELETE /vehicles/:id          # Delete vehicle

GET    /hosts/:id             # Get host profile
PUT    /hosts/:id             # Update host profile

GET    /plans                 # Get available plans
POST   /plans/subscribe       # Subscribe to plan
```

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android

## Performance Targets

- Home page load: < 2 seconds
- Vehicle list load: < 2 seconds
- Vehicle detail page: < 3 seconds
- No JavaScript errors in console

## Security Notes

- Never commit `.env` files or API keys
- Use HTTPS in production
- Validate all user inputs on backend
- Sanitize output to prevent XSS
- CSRF tokens for form submissions
- Rate limit API endpoints

## Contributing

1. Create feature branch from main
2. Make changes with clear commits
3. Test thoroughly (TESTING.md)
4. Create Pull Request with description
5. Address code review feedback
6. Merge when approved

## Troubleshooting

### Menu not updating after login
- Check browser console for errors
- Verify `ccr:signedIn` event is fired
- Ensure auth.js is loaded before menu JS runs

### Vehicle cache quota error
- Clear localStorage in DevTools
- Refresh page
- Check vehicleStore.js cache size

### Images not loading
- Verify image paths are correct
- Check assets folder structure
- Use local fallback: `assets/default-car.jpg`

## Support & Contact

For issues, questions, or suggestions:
- Email: dev@clyderoccr.com
- Issues: https://github.com/clyderoccr-beep/clyderocashcarrental/issues

## License

MIT License - See LICENSE file for details

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and recent changes.

---

**Last Updated**: 2025-12-07  
**Current Version**: 1.2.0
