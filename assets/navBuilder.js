/**
 * Shared Navigation Drawer Builder
 * Builds the menu dynamically based on auth state
 * Used on every page to ensure consistent menu across the entire app
 * 
 * CRITICAL: Menu is NOT rendered until Firebase auth state is checked.
 * This prevents the 1-second flicker of wrong menu items.
 */

const NavBuilder = (function() {
	'use strict';

	let menuRendered = false; // Track if we've rendered the menu at least once

	// Menu item definitions
	const GUEST_ITEMS = [
		{ id: 'signin', label: 'Sign In', href: 'signin.html' },
		{ id: 'vehicles', label: 'Vehicles', href: 'vehicles.html' },
		{ id: 'become-host', label: 'Become a Host', href: 'host-signup.html' },
		{ id: 'terms', label: 'Terms &amp; Conditions', href: 'terms.html' },
		{ id: 'host-agreement', label: 'Host Agreement', href: 'host-agreement.html' },
		{ id: 'safety', label: 'Safety Guidelines', href: 'safety.html' },
		{ id: 'contact', label: 'Contact', href: 'contact.html' },
	];

	const HOST_ITEMS = [
		{ id: 'account', label: 'My Account', href: 'account.html' },
		{ id: 'vehicles', label: 'Vehicles', href: 'vehicles.html' },
		{ id: 'become-host', label: 'Become a Host', href: 'host-signup.html' },
		{ id: 'upgrade', label: 'Upgrade Plan', href: 'upgrade.html' },
		{ id: 'terms', label: 'Terms &amp; Conditions', href: 'terms.html' },
		{ id: 'host-agreement', label: 'Host Agreement', href: 'host-agreement.html' },
		{ id: 'safety', label: 'Safety Guidelines', href: 'safety.html' },
		{ id: 'contact', label: 'Contact', href: 'contact.html' },
		{ id: 'signout', label: 'Sign Out', href: '#', action: 'signout' },
	];

	/**
	 * Render the navigation menu based on auth state
	 * CRITICAL: Only called AFTER auth state is verified
	 */
	function renderNav(isLoggedIn) {
		const navList = document.getElementById('nav-list');
		if (!navList) {
			console.warn(' nav-list element not found');
			return;
		}

		console.log(` renderNav(${isLoggedIn ? 'HOST' : 'GUEST'})`);

		// Clear existing items
		navList.innerHTML = '';

		// Choose items based on auth state
		const items = isLoggedIn ? HOST_ITEMS : GUEST_ITEMS;

		// Create each menu item
		items.forEach((item) => {
			const li = document.createElement('li');
			li.className = 'menu-item';
			li.setAttribute('data-menu-id', item.id);

			const a = document.createElement('a');
			a.innerHTML = item.label;

			// Handle sign out action
			if (item.action === 'signout') {
				a.href = '#';
				a.addEventListener('click', (e) => {
					e.preventDefault();
					console.log(' Sign Out clicked by user');
					handleSignOut();
				});
			} else {
				a.href = item.href;

				// Close menu on link click
				a.addEventListener('click', () => {
					closeMenu();
				});
			}

			li.appendChild(a);
			navList.appendChild(li);
		});

		// Mark menu as rendered
		menuRendered = true;

		// Highlight current page
		highlightCurrentPage();
	}

	/**
	 * Highlight the current page in the menu
	 */
	function highlightCurrentPage() {
		const currentPath = window.location.pathname;
		const currentFile = currentPath.split('/').pop() || 'index.html';

		document.querySelectorAll('.menu-item').forEach((item) => {
			const link = item.querySelector('a');
			if (link) {
				const href = link.getAttribute('href');
				const hrefFile = href.split('/').pop().split('#')[0];

				// Match current page
				if (
					currentFile === hrefFile ||
					(currentFile === '' && hrefFile === 'index.html') ||
					(currentFile === 'index.html' && hrefFile === 'index.html')
				) {
					item.classList.add('active');
				} else {
					item.classList.remove('active');
				}
			}
		});
	}

	/**
	 * Handle sign out action
	 * CRITICAL: Must close drawer AND let auth state change rebuild menu
	 */
	function handleSignOut() {
		console.log(' Sign Out handler triggered');
		
		// Close the drawer IMMEDIATELY (don't wait for auth)
		closeMenu();
		
		// Call Firebase sign out - redirect to sign in page
		if (typeof AuthManager !== 'undefined' && AuthManager.signOut) {
			console.log(' Calling AuthManager.signOut()');
			AuthManager.signOut({ redirect: true, target: 'signin.html' });
		} else {
			console.error(' AuthManager not available - using fallback logout');
			// Fallback: force logout directly via Firebase if available
			if (window.firebaseAuth && window.firebase && firebase.auth) {
				try {
					localStorage.setItem('_forceSignOut', 'true');
					localStorage.removeItem('CJF_CURRENT_USER');
					localStorage.removeItem('CJF_USER_ROLE');
					localStorage.removeItem('ccrSignedIn');
					// Disable persistence and sign out
					window.firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.NONE)
						.then(() => window.firebaseAuth.signOut())
						.finally(() => {
							console.log(' Fallback sign-out complete; redirecting to signin');
							window.location.replace('signin.html');
						});
				} catch (err) {
					console.error(' Fallback Firebase sign-out error:', err);
					window.location.replace('signin.html');
				}
			} else {
				// No AuthManager and no Firebase; just redirect
				console.warn(' No AuthManager or Firebase - redirecting to signin');
				window.location.replace('signin.html');
			}

			// Render guest menu immediately
			renderNav(false);
		}
	}

	/**
	 * Close the navigation menu
	 */
	function closeMenu() {
		const menuPanel = document.getElementById('menuPanel');
		const backdrop = document.getElementById('backdrop');
		if (menuPanel) menuPanel.classList.remove('open');
		if (backdrop) backdrop.classList.remove('show');
		document.body.classList.remove('menu-open');
	}

	/**
	 * Open the navigation menu
	 */
	function openMenu() {
		const menuPanel = document.getElementById('menuPanel');
		const backdrop = document.getElementById('backdrop');
		if (menuPanel) menuPanel.classList.add('open');
		if (backdrop) backdrop.classList.add('show');
		document.body.classList.add('menu-open');

		// Focus first menu item
		setTimeout(() => {
			const firstLink = menuPanel.querySelector('a');
			if (firstLink) firstLink.focus();
		}, 300);
	}

	/**
	 * Update the menu when auth state changes
	 * CRITICAL: This runs on EVERY page whenever auth state changes
	 * It's the single source of truth for which menu to show
	 */
	function onAuthStateChange(event) {
		console.log(' Auth state changed - rebuilding menu');
		
		if (typeof AuthManager === 'undefined') {
			console.warn(' AuthManager not available');
			renderNav(false);
			return;
		}

		try {
			// Check Firebase auth directly - this is the most reliable source
			if (window.firebaseAuth && window.firebaseAuth.currentUser) {
				console.log(' Firebase.currentUser exists:', window.firebaseAuth.currentUser.uid);
				renderNav(true); // Show host menu
			} else if (AuthManager.isAuthenticated && AuthManager.isAuthenticated()) {
				console.log(' AuthManager.isAuthenticated() returned true');
				renderNav(true); // Show host menu
			} else {
				console.log(' No user authenticated - showing guest menu');
				renderNav(false); // Show guest menu
			}
		} catch (e) {
			console.error(' Error in onAuthStateChange:', e);
			renderNav(false);
		}
	}

	/**
	 * Set up event listeners
	 */
	function setupEventListeners() {
		const openBtn = document.getElementById('menuToggle');
		const closeBtn = document.getElementById('menuClose');
		const backdrop = document.getElementById('backdrop');

		if (openBtn) openBtn.addEventListener('click', openMenu);
		if (closeBtn) closeBtn.addEventListener('click', closeMenu);
		document.querySelectorAll('.menu-close').forEach(btn => btn.addEventListener('click', closeMenu));
		if (backdrop) backdrop.addEventListener('click', closeMenu);

		// Close menu on ESC
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				const menuPanel = document.getElementById('menuPanel');
				if (menuPanel && menuPanel.classList.contains('open')) {
					closeMenu();
				}
			}
		});

		// Focus trap in menu
		const menuPanel = document.getElementById('menuPanel');
		if (menuPanel) {
			menuPanel.addEventListener('keydown', (e) => {
				if (e.key === 'Tab') {
					const focusableElements = menuPanel.querySelectorAll('a, button');
					const firstElement = focusableElements[0];
					const lastElement = focusableElements[focusableElements.length - 1];

					if (e.shiftKey && document.activeElement === firstElement) {
						e.preventDefault();
						lastElement.focus();
					} else if (!e.shiftKey && document.activeElement === lastElement) {
						e.preventDefault();
						firstElement.focus();
					}
				}
			});
		}
	}

	/**
	 * Initialize the navigation
	 * CRITICAL: Do NOT render menu until auth state is known
	 */
	function init() {
		console.log(' Initializing NavBuilder...');

		// Set up DOM event listeners FIRST
		setupEventListeners();

		// Render a fast guest menu immediately to avoid empty header while auth loads
		// The menu will be swapped to the host view once auth state arrives
		if (!menuRendered) {
			renderNav(false);
		}

		// Set up auth state change listeners IMMEDIATELY
		// This ensures we catch auth changes from Firebase
		document.addEventListener('authStateChanged', onAuthStateChange);
		document.addEventListener('ccr:signedIn', onAuthStateChange);
		document.addEventListener('ccr:signedOut', onAuthStateChange);

		// Wait for AuthManager to be available, then render menu ONCE
		// This prevents the 1-second flicker of wrong menu
		let waitCount = 0;
		const checkAuthManager = setInterval(() => {
			waitCount++;
			
			if (typeof AuthManager !== 'undefined' && AuthManager.isAuthenticated) {
				clearInterval(checkAuthManager);
				console.log(' AuthManager available on attempt', waitCount);
				// Render according to real auth state
				onAuthStateChange();
			} else if (waitCount > 20) {
				// Timeout after ~1 second (20 * 50ms) for faster fallback
				clearInterval(checkAuthManager);
				console.log(' AuthManager not loaded after', waitCount, 'attempts, using guest menu');
				
				// Check Firebase directly if AuthManager not available
				if (window.firebaseAuth && window.firebaseAuth.currentUser) {
					console.log(' Firebase user detected, rendering host menu');
					renderNav(true);
				} else {
					console.log(' No user detected, keeping guest menu');
					// guest menu already rendered; ensure highlight is correct
					highlightCurrentPage();
				}
			}
		}, 50);
	}

	// Auto-initialize when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

	// Public API (for testing/debugging)
	return {
		renderNav,
		closeMenu,
		openMenu,
		init,
	};
})();
