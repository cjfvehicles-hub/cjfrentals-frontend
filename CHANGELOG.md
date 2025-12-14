# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-12-07

### Added
- Centralized authentication UI sync across all pages (header/menu updates immediately on login)
- Click handler for hamburger menu Sign In button
- Event listeners for `ccr:signedIn` and `ccr:signedOut` events
- Vehicle cache optimization to reduce localStorage quota errors
- Default avatar image replacement for broken placeholder URLs

### Fixed
- Menu not updating after first login click (required two clicks for UI to sync)
- Cross-page navigation menu state desync (logged in but UI showed logged out)
- localStorage quota exceeded error from oversized vehicle cache
- Broken external avatar image URL

### Changed
- Vehicle cache now stores only essential fields (id, make, model, year, category, price, image)
- All pages now use `AuthManager.updateUIForRole()` for consistent UI updates
- Login flow triggers immediate menu refresh via `ccr:signedIn` event

## [1.1.0] - 2025-12-06

### Added
- `AuthManager` centralized authentication system
- `VehicleStore` for vehicle data management
- Host profile pages (private and public)
- Vehicle detail page with Turo-style gallery
- Plan management UI
- Host dashboard

### Fixed
- Vehicle gallery layout constraints
- Sign-out flow and storage cleanup

## [1.0.0] - 2025-12-01

### Added
- Initial project setup
- Home page with vehicle browsing
- Account page for hosts
- Basic styling and responsive layout
- Menu/navigation system
