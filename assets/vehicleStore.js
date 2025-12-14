/**
 * CJF Vehicle Data Store - Single Source of Truth
 * Now uses Backend API with localStorage fallback
 */

// Detect production domain to ensure strict failures (no silent cache fallback)
const IS_PROD = (typeof window !== 'undefined' && window.location && /cjfrentals\.com$/i.test(window.location.hostname));

// Global toggle so both this module and the post-init health check share the same flag
const USE_BACKEND = (typeof window !== 'undefined' && typeof window.USE_BACKEND !== 'undefined')
	? window.USE_BACKEND
	: false;
if (typeof window !== 'undefined') {
	window.USE_BACKEND = USE_BACKEND;
}

const VehicleStore = (function() {
	'use strict';
    
	const API_URL = 'http://localhost:3000/api';
	const STORAGE_KEY = 'CJF_VEHICLES_CACHE';
	const PENDING_DELETES_KEY = 'CJF_PENDING_DELETES';
	const FIREBASE_BACKOFF_MS = 60000; // Avoid spamming Firebase when offline
	const SAMPLE_VEHICLES = [
		{
			id: 'demo-1',
			make: 'Tesla',
			model: 'Model 3',
			year: 2022,
			category: 'Sedan',
			fuel: 'Electric',
			country: 'USA',
			state: 'CA',
			city: 'San Francisco',
			price: 129,
			frequency: 'Daily',
			status: 'active',
			image: 'assets - Copy/default-car.jpg',
			hostId: 'demo-host',
			hostName: 'Demo Host',
			hostEmail: 'host@example.com',
			hostAvatar: 'assets - Copy/default-car.jpg',
			trips: 18
		},
		{
			id: 'demo-2',
			make: 'Range Rover',
			model: 'Velar',
			year: 2021,
			category: 'SUV',
			fuel: 'Gas',
			country: 'USA',
			state: 'NY',
			city: 'New York',
			price: 189,
			frequency: 'Daily',
			status: 'active',
			image: 'assets - Copy/default-car.jpg',
			hostId: 'demo-host',
			hostName: 'Demo Host',
			hostEmail: 'host@example.com',
			hostAvatar: 'assets - Copy/default-car.jpg',
			trips: 25
		},
		{
			id: 'demo-3',
			make: 'BMW',
			model: 'M4',
			year: 2020,
			category: 'Coupe',
			fuel: 'Gas',
			country: 'USA',
			state: 'FL',
			city: 'Miami',
			price: 175,
			frequency: 'Daily',
			status: 'active',
			image: 'assets - Copy/default-car.jpg',
			hostId: 'demo-host',
			hostName: 'Demo Host',
			hostEmail: 'host@example.com',
			hostAvatar: 'assets - Copy/default-car.jpg',
			trips: 12
		}
	];
	
	// Cache for offline support
	let vehicleCache = [];
	let lastSync = null;
	let firebaseUnavailable = false;
	let firebaseLastFail = 0;
	function loadSampleVehicles() {
		saveToCache(SAMPLE_VEHICLES);
		return SAMPLE_VEHICLES;
	}

	// Pending delete queue (IDs we failed to delete on Firebase due to offline/permission issues)
	function loadPendingDeletes() {
		try {
			const raw = localStorage.getItem(PENDING_DELETES_KEY);
			return raw ? JSON.parse(raw) : [];
		} catch (e) {
			console.warn(' Failed to load pending deletes:', e.message);
			return [];
		}
	}

	function savePendingDeletes(list) {
		try {
			localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(list));
		} catch (e) {
			console.warn(' Failed to save pending deletes:', e.message);
		}
	}
	
	/**
	 * Get authorization header if user is logged in
	 */
	function getAuthHeader() {
		const user = AuthManager.getCurrentUser ? AuthManager.getCurrentUser() : null;
		if (user && user.id) {
			return {
				'Authorization': `Bearer ${user.id}`
			};
		}
		return {};
	}
	
	/**
	 * Make API request with error handling
	 */
	async function apiRequest(endpoint, options = {}) {
		if (!USE_BACKEND) {
			throw new Error('Backend disabled, using localStorage');
		}
		
		   try {
			   const response = await fetch(`${API_URL}${endpoint}`, {
				   headers: {
					   'Content-Type': 'application/json',
					   ...getAuthHeader(),
					   ...options.headers
				   },
				   ...options
			   });

			   const contentType = response.headers.get('Content-Type') || '';
			   if (!response.ok) {
				   if (contentType.includes('application/json')) {
					   const errorData = await response.json();
					   throw new Error(errorData.message || `API Error: ${response.status}`);
				   } else {
					   const errorText = await response.text();
					   throw new Error(`API Error: ${response.status} - Non-JSON response: ${errorText.substring(0, 80)}`);
				   }
			   }

			   if (contentType.includes('application/json')) {
				   const data = await response.json();
				   return data;
			   } else {
				   const errorText = await response.text();
				   throw new Error(`API returned non-JSON response: ${errorText.substring(0, 80)}`);
			   }
		   } catch (error) {
			   console.warn(' API request failed, using cache:', error.message);
			   throw error;
		   }
	}
	
	/**
	 * Save to cache (for offline support)
	 */
	function saveToCache(vehicles) {
		try {
			vehicleCache = vehicles;
			// Save complete vehicle data
			localStorage.setItem(STORAGE_KEY, JSON.stringify({
				vehicles: vehicles,
				lastSync: new Date().toISOString()
			}));
			console.log(` Cached ${vehicles.length} vehicles to localStorage`);
		} catch (e) {
			console.error('Failed to save cache:', e);
			// If storage quota exceeded, clear and retry
			try {
				localStorage.removeItem(STORAGE_KEY);
				localStorage.setItem(STORAGE_KEY, JSON.stringify({
					vehicles: vehicles,
					lastSync: new Date().toISOString()
				}));
				console.log('Cache saved after clearing old data');
			} catch (e2) {
				console.error('Failed to save cache even after clearing:', e2);
			}
		}
	}
	
	/**
	 * Load from cache
	 */
	function loadFromCache() {
		try {
			const cached = localStorage.getItem(STORAGE_KEY);
			if (cached) {
				const data = JSON.parse(cached);
				const pendingDeletes = new Set(loadPendingDeletes().map(String));
				vehicleCache = (data.vehicles || []).filter(v => !pendingDeletes.has(String(v.id)));
				lastSync = data.lastSync;
				return vehicleCache;
			}
		} catch (e) {
			console.error('Failed to load cache:', e);
		}
		return [];
	}

	/**
	 * Get only active vehicles (for public display)
	 */
	async function getActiveVehicles() {
		const db = window.firebaseDb || null;
		// SVG placeholder that works without external URL
		const placeholderSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23e5e7eb;stop-opacity:1" /><stop offset="100%" style="stop-color:%23d1d5db;stop-opacity:1" /></linearGradient></defs><rect fill="url(%23grad)" width="400" height="300"/><g transform="translate(200, 80)"><circle cx="0" cy="0" r="35" fill="%23999" opacity="0.3"/></g><g transform="translate(200, 160)"><rect x="-60" y="0" width="120" height="70" rx="8" fill="none" stroke="%23999" stroke-width="3" opacity="0.3"/><rect x="-50" y="10" width="30" height="20" rx="4" fill="%23999" opacity="0.3"/><rect x="20" y="10" width="30" height="20" rx="4" fill="%23999" opacity="0.3"/><rect x="-35" y="50" width="70" height="8" rx="4" fill="%23999" opacity="0.3"/></g><text x="200" y="280" text-anchor="middle" font-family="Arial" font-size="16" fill="%23999" opacity="0.5">No photo</text></svg>';
		
		if (db && canUseFirebase()) {
			try {
				const pendingDeletes = new Set(loadPendingDeletes().map(String));
				// Simpler query to reduce index/rules complexity: only 'active'
				const snap = await db.collection('vehicles').where('status', '==', 'active').get();
				let vehicles = snap.docs
					.map(d => ({ id: d.id, ...d.data() }))
					.filter(v => v.status !== 'hidden' && !pendingDeletes.has(String(v.id)));
				
				// Ensure all vehicles have an image field (for display fallback)
				vehicles = vehicles.map(v => ({
					...v,
					image: v.image || (v.photos && v.photos[0]) || placeholderSvg
				}));
				
				saveToCache(vehicles);
				firebaseUnavailable = false;
				console.log(` VehicleStore: ${vehicles.length} active vehicles from Firebase`);
				return vehicles;
			} catch (e) {
				if (noteFirebaseFailure()) {
					const reason = IS_PROD ? 'production failure' : 'fallback to cache';
					console.warn(` Firebase active load failed (${reason})`);
				}
			}
		}
		let all = await getAllVehicles();
		const pendingDeletes = new Set(loadPendingDeletes().map(String));
		let active = all.filter(v => (v.status === 'active' || !v.status) && !pendingDeletes.has(String(v.id)));
		
		// Ensure all vehicles have an image field (for display fallback)
		active = active.map(v => ({
			...v,
			image: v.image || (v.photos && v.photos[0]) || placeholderSvg
		}));
		
		console.log(` VehicleStore: ${active.length} active vehicles from cache`);
		return active;
	}

	const getActiveVehiclesFn = getActiveVehicles;

	function canUseFirebase() {
		if (!window.firebaseDb) return false;
		if (!firebaseUnavailable) return true;
		return Date.now() - firebaseLastFail > FIREBASE_BACKOFF_MS;
	}

	function noteFirebaseFailure() {
		const now = Date.now();
		const shouldLog = !firebaseUnavailable || (now - firebaseLastFail > FIREBASE_BACKOFF_MS);
		firebaseUnavailable = true;
		firebaseLastFail = now;
		return shouldLog;
	}
	
	/**
	 * Get vehicles owned by the current authenticated user
	 */
	async function getUserVehicles() {
		const placeholderSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23e5e7eb;stop-opacity:1" /><stop offset="100%" style="stop-color:%23d1d5db;stop-opacity:1" /></linearGradient></defs><rect fill="url(%23grad)" width="400" height="300"/><g transform="translate(200, 80)"><circle cx="0" cy="0" r="35" fill="%23999" opacity="0.3"/></g><g transform="translate(200, 160)"><rect x="-60" y="0" width="120" height="70" rx="8" fill="none" stroke="%23999" stroke-width="3" opacity="0.3"/><rect x="-50" y="10" width="30" height="20" rx="4" fill="%23999" opacity="0.3"/><rect x="20" y="10" width="30" height="20" rx="4" fill="%23999" opacity="0.3"/><rect x="-35" y="50" width="70" height="8" rx="4" fill="%23999" opacity="0.3"/></g><text x="200" y="280" text-anchor="middle" font-family="Arial" font-size="16" fill="%23999" opacity="0.5">No photo</text></svg>';
		const db = window.firebaseDb || null;
		const uid = window.firebaseAuth?.currentUser?.uid || null;
		if (!db || !uid) {
			// If offline, filter cache by owner and pending deletes
			const pendingDeletes = new Set(loadPendingDeletes().map(String));
			let vehicles = loadFromCache().filter(v => v.ownerId === uid && !pendingDeletes.has(String(v.id)));
			// Ensure all vehicles have an image field (for display fallback)
			vehicles = vehicles.map(v => ({
				...v,
				image: v.image || (v.photos && v.photos[0]) || placeholderSvg
			}));
			return vehicles;
		}
		try {
			const snap = await db.collection('vehicles').where('ownerId', '==', uid).get();
			const pendingDeletes = new Set(loadPendingDeletes().map(String));
			let vehicles = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => !pendingDeletes.has(String(v.id)));
			// Log raw data before processing
			vehicles.forEach(v => {
				console.log(` Vehicle ${v.id} raw data:`, { 
					hasImage: !!v.image, 
					imageValue: v.image ? v.image.substring(0, 80) : 'NONE',
					hasPhotos: !!v.photos, 
					photosCount: v.photos ? v.photos.length : 0,
					firstPhoto: v.photos && v.photos[0] ? v.photos[0].substring(0, 80) : 'NONE'
				});
			});
			// DO NOT override with placeholder - just return as-is
			console.log(` VehicleStore: ${vehicles.length} user vehicles loaded from Firebase`);
			return vehicles;
		} catch (e) {
			console.warn(' Failed to load user vehicles:', e.message);
			return [];
		}
	}

	/**
	 * Get all vehicles from backend
	 */
	async function getAllVehicles() {
			// Prefer Firebase if available and not recently failing
			const db = window.firebaseDb || null;
			if (db && canUseFirebase()) {
				try {
					// Only fetch active vehicles to align with Firestore security rules
						const snap = await db.collection('vehicles').where('status','==','active').get();
						const pendingDeletes = new Set(loadPendingDeletes().map(String));
						let vehicles = snap.docs
							.map(d => ({ id: d.id, ...d.data() }))
							.filter(v => !pendingDeletes.has(String(v.id)))
							.sort((a,b)=>{
								const aa = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
								const bb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
								return bb - aa;
							});
						if (!IS_PROD && vehicles.length === 0) {
							console.log(' VehicleStore: Firebase empty, using demo vehicles (dev only)');
							vehicles = loadSampleVehicles();
						}
						saveToCache(vehicles);
						console.log(` VehicleStore: Loaded ${vehicles.length} vehicles from Firebase`);
						firebaseUnavailable = false; // Reset on success
						return vehicles;
					} catch (e) {
						if (noteFirebaseFailure()) {
							if (IS_PROD) {
							console.error(' Firebase load failed in production:', e);
							throw e;
						} else {
							console.warn(' Firebase load failed, falling back to cache');
						}
					}
				}
			}

			// Fallback to cache only (no demo/sample data)
			const cached = loadFromCache();
			if (cached.length > 0) {
				console.log(` VehicleStore: Loaded ${cached.length} vehicles from cache`);
				return cached;
			}
			
			// No vehicles available - use local demo data for offline view
			console.log(' VehicleStore: No vehicles available; loading offline demo vehicles');
			return loadSampleVehicles();
	}
	
	/**
	 * Get only active vehicles (for public display)
						if (IS_PROD) { throw e; }
						if (noteFirebaseFailure()) {
							const isPerm = (e && (e.code === 'permission-denied' || String(e.message || '').includes('insufficient permissions')));
							const reason = isPerm ? 'permission denied' : 'offline/unavailable';
							console.warn(` Firebase delete failed (${reason}), falling back to cache`);
						}
				try {
					const snap = await db.collection('vehicles').where('status', 'in', ['active', null]).get();
					const vehicles = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => v.status !== 'hidden');
					console.log(` VehicleStore: ${vehicles.length} active vehicles from Firebase`);
					saveToCache(vehicles);
					firebaseUnavailable = false; // Reset on success
					return vehicles;
				} catch (e) {
					if (noteFirebaseFailure()) {
						console.warn(' Firebase active load failed, using cache');
					}
				}
			}
			const all = await getAllVehicles();
			const active = all.filter(v => v.status === 'active' || !v.status);
			console.log(` VehicleStore: ${active.length} active vehicles from cache`);
			return active;
	}
	
	/**
	 * Get vehicle by ID
	 */
	async function getVehicleById(id) {
		try {
			const response = await apiRequest(`/vehicles/${id}`);
			return response.data;
		} catch (error) {
			const all = await getAllVehicles();
			return all.find(v => v.id == id);
		}
	}
	
	/**
	 * Add a new vehicle
	 */
	/**
	 * Check if plan limit allows adding a new vehicle
	 */
	const PLAN_LIMITS = {
		free: 2,       // lifetime free postings
		starter: 5,    // active cap
		pro: Number.MAX_SAFE_INTEGER
	};

	let cachedPlan = null;
	let cachedProfile = null;
	let cachedVehicleCounts = null;

	async function getUserProfile() {
		const uid = window.firebaseAuth?.currentUser?.uid || (window.AuthManager && AuthManager.getCurrentUser && AuthManager.getCurrentUser()?.id) || null;
		const db = window.firebaseDb || null;
		if (!uid || !db || !canUseFirebase()) return null;
		if (cachedProfile) return cachedProfile;
		try {
			const snap = await db.collection('users').doc(uid).get();
			if (snap.exists) {
				cachedProfile = { id: uid, ...snap.data() };
				return cachedProfile;
			}
		} catch (e) {
			console.warn('User profile fetch failed:', e.message);
		}
		return null;
	}

	async function getUserCounts() {
		if (cachedVehicleCounts) return cachedVehicleCounts;
		const db = window.firebaseDb || null;
		const uid = window.firebaseAuth?.currentUser?.uid || (window.AuthManager && AuthManager.getCurrentUser && AuthManager.getCurrentUser()?.id) || null;
		if (!db || !uid || !canUseFirebase()) return { active: 0, created: 0 };
		try {
			const snap = await db.collection('vehicles').where('ownerId','==',uid).get();
			const active = snap.docs.filter(d => d.data().status === 'active').length;
			const created = snap.size;
			cachedVehicleCounts = { active, created };
			return cachedVehicleCounts;
		} catch (e) {
			console.warn('Vehicle count lookup failed, defaulting to zeros:', e.message);
			return { active: 0, created: 0 };
		}
	}

	async function getUserPlan() {
		if (cachedPlan) return cachedPlan;
		const profile = await getUserProfile();
		const plan = profile?.plan ? String(profile.plan).toLowerCase() : 'free';
		cachedPlan = PLAN_LIMITS[plan] ? plan : 'free';
		return cachedPlan;
	}

	async function canAddVehicle() {
		const db = window.firebaseDb || null;
		const uid = window.firebaseAuth?.currentUser?.uid || (window.AuthManager && AuthManager.getCurrentUser && AuthManager.getCurrentUser()?.id) || null;
		const planKey = await getUserPlan();
		const planLimit = PLAN_LIMITS[planKey] ?? 2;
		const profile = await getUserProfile();
		const lifetimeCreated = profile?.vehiclesCreated || 0;
		const counts = await getUserCounts();

		const buildResult = (count) => ({
			allowed: planKey === 'free'
				? (lifetimeCreated < PLAN_LIMITS.free && count < PLAN_LIMITS.free)
				: (count < planLimit),
			activeCount: count,
			planLimit,
			planKey,
			message: (() => {
				if (planKey === 'free' && lifetimeCreated >= PLAN_LIMITS.free) {
					return 'You used your 2 free postings. Upgrade to add more vehicles.';
				}
				if (count >= planLimit) {
					return `You've reached your ${planKey} plan limit of ${planLimit === Number.MAX_SAFE_INTEGER ? 'unlimited' : planLimit} active vehicles. Please upgrade to a higher plan or deactivate another vehicle first.`;
				}
				return null;
			})()
		});

		if (db && uid && canUseFirebase()) {
			try {
				const snap = await db.collection('vehicles').where('ownerId','==',uid).get();
				const activeCount = snap.docs.filter(d => d.data().status === 'active').length;
				return buildResult(activeCount);
			} catch (error) {
				console.error('Error checking plan limit:', error);
				return buildResult(0);
			}
		}
		// Fallback: use cache
		try {
			const allVehicles = loadFromCache();
			const activeCount = allVehicles.filter(v => v.status === 'active' && (!uid || v.ownerId === uid)).length;
			return buildResult(activeCount);
		} catch {
			return buildResult(0);
		}
	}

	async function addVehicle(vehicleData) {
			// Check plan limit before adding
			const planCheck = await canAddVehicle();
			if (!planCheck.allowed) {
				const error = new Error(planCheck.message);
				error.code = 'PLAN_LIMIT_EXCEEDED';
				throw error;
			}
			// Prefer Firebase Auth user ID
			const firebaseUid = window.firebaseAuth?.currentUser?.uid || null;
			const legacyUser = (window.AuthManager && AuthManager.getCurrentUser && AuthManager.getCurrentUser()) || null;
			const ownerId = firebaseUid || (legacyUser && legacyUser.id) || null;
			if (!ownerId) throw new Error('Not authenticated');
			const id = String(vehicleData.id || Date.now());
			const now = new Date().toISOString();
			const docData = { ...vehicleData, id, ownerId, createdAt: vehicleData.createdAt || now, updatedAt: now };

			// Try backend first so a profile exists immediately
			if (USE_BACKEND) {
				try {
					const response = await apiRequest('/vehicles', {
						method: 'POST',
						body: JSON.stringify({ ...docData, hostId: ownerId })
					});
					const saved = response?.data || response;
					if (saved) {
						const existing = loadFromCache().filter(v => String(v.id) !== String(saved.id));
						saveToCache([saved, ...existing]);
					console.log(`VehicleStore: Added vehicle ID ${saved.id} via backend`);
						return saved;
					}
				} catch (err) {
					console.warn('Backend add failed, falling back to Firebase:', err.message || err);
				}
			}

			const db = window.firebaseDb || null;
			if (!db) throw new Error('Firebase not initialized');
			await db.collection('vehicles').doc(id).set(docData);
			console.log(`VehicleStore: Added vehicle ID ${id} via Firebase`);
			// Increment lifetime created count for this user
			try {
				await db.collection('users').doc(ownerId).set({ vehiclesCreated: firebase.firestore.FieldValue.increment(1) }, { merge: true });
				cachedProfile = null; // refresh next fetch
			} catch (e) {
				console.warn('Failed to increment vehiclesCreated:', e.message);
			}
			// Use getUserVehicles to refresh (respects Firestore rules)
			const refreshed = await getUserVehicles();
			const created = refreshed.find(v => String(v.id) === String(id));
			if (created) return created;

			// Fallback: seed cache and return docData
			const existing = loadFromCache().filter(v => String(v.id) !== String(id));
			saveToCache([docData, ...existing]);
			return docData;
	}
	/**
	 * Update an existing vehicle
	 */
	async function updateVehicle(vehicleId, updatedData) {
			const db = window.firebaseDb || null;
			if (!db) throw new Error('Firebase not initialized');
			const ownerId = window.firebaseAuth?.currentUser?.uid || ((window.AuthManager && AuthManager.getCurrentUser && AuthManager.getCurrentUser())?.id) || null;
			if (!ownerId) throw new Error('Not authenticated');
			const now = new Date().toISOString();

			// Guard: enforce free-plan single edit
			let existingData = {};
			const snap = await db.collection('vehicles').doc(String(vehicleId)).get();
			if (snap.exists) {
				existingData = snap.data() || {};
				if (existingData.ownerId && String(existingData.ownerId) !== String(ownerId)) {
					throw new Error('Not authorized to edit this vehicle');
				}
			}

			const planKey = await getUserPlan();
			if (planKey === 'free') {
				const edits = Number(existingData.editCount || 0);
				if (edits >= 1) {
					const err = new Error('Free plan allows one edit per vehicle. Upgrade to edit again.');
					err.code = 'EDIT_LIMIT';
					throw err;
				}
				updatedData.editCount = edits + 1;
			}

			await db.collection('vehicles').doc(String(vehicleId)).set({ ...updatedData, ownerId, updatedAt: now }, { merge: true });
			console.log(` VehicleStore: Updated vehicle ID ${vehicleId} via Firebase`);
			const refreshed = await getAllVehicles();
			return refreshed.find(v => String(v.id) === String(vehicleId));
	}
	
	/**
	 * Delete a vehicle
	 */
	async function deleteVehicle(vehicleId) {
			console.log(` VehicleStore: Attempting to delete vehicle ID ${vehicleId}`);
			const db = window.firebaseDb || null;
			if (db && canUseFirebase()) {
				try {
					const current = (window.AuthManager && AuthManager.getCurrentUser && AuthManager.getCurrentUser()) || null;
					if (!current || !current.id) throw new Error('Not authenticated');
					const doc = await db.collection('vehicles').doc(String(vehicleId)).get();
					if (doc.exists) {
						const data = doc.data();
						if (data.ownerId && String(data.ownerId) !== String(current.id)) {
							throw Object.assign(new Error('insufficient permissions'), { code: 'permission-denied' });
						}
					}
					await db.collection('vehicles').doc(String(vehicleId)).delete();
					console.log(` VehicleStore: Firebase delete successful for ID ${vehicleId}`);
					// Purge from local cache/localStorage so it disappears everywhere
					vehicleCache = vehicleCache.filter(v => String(v.id) !== String(vehicleId));
					saveToCache(vehicleCache);
					// Remove from pending deletes if it was queued
					const pending = loadPendingDeletes().filter(id => String(id) !== String(vehicleId));
					savePendingDeletes(pending);
					await getAllVehicles();
					return true;
				} catch (e) {
					if (noteFirebaseFailure()) {
						const isPerm = (e && (e.code === 'permission-denied' || String(e.message || '').includes('insufficient permissions')));
						const reason = isPerm ? 'permission denied' : 'offline/unavailable';
						console.warn(` Firebase delete failed (${reason}), falling back to cache`);
					}
					// Queue pending delete for retry
					const pending = loadPendingDeletes();
					if (!pending.includes(String(vehicleId))) {
						pending.push(String(vehicleId));
						savePendingDeletes(pending);
					}
				}
			}
			const beforeCount = vehicleCache.length;
			vehicleCache = vehicleCache.filter(v => String(v.id) !== String(vehicleId));
			const afterCount = vehicleCache.length;
			saveToCache(vehicleCache);
			console.log(` Cache updated: ${beforeCount}  ${afterCount} vehicles`);
			return beforeCount > afterCount;
	}
	
	/**
	 * Change vehicle status
	 */
	async function setVehicleStatus(vehicleId, status) {
		const validStatuses = ['active', 'hidden'];
		if (!validStatuses.includes(status)) {
			console.error(` VehicleStore: Invalid status "${status}"`);
			return false;
		}
		
		console.log(` VehicleStore: Setting status for ${vehicleId}  ${status}`);
		const db = window.firebaseDb || null;
		if (db) {
			try {
				await db.collection('vehicles').doc(String(vehicleId)).set({
					status: status,
					updatedAt: Date.now()
				}, { merge: true });
				console.log(' Firebase status update success');
				await getAllVehicles();
				return true;
			} catch (e) {
				console.error(' Firebase status update failed, will update cache:', e);
			}
		}
		let changed = false;
		vehicleCache = vehicleCache.map(v => {
			if (String(v.id) === String(vehicleId)) {
				changed = true;
				return { ...v, status: status, updatedAt: Date.now() };
			}
			return v;
		});
		if (changed) {
			saveToCache(vehicleCache);
			return true;
		}
		return false;
	}
	
	/**
	 * Get statistics
	 */
	async function getStats() {
		try {
			const response = await apiRequest('/vehicles/stats/summary');
			return response.data;
		} catch (error) {
			const all = await getAllVehicles();
			const active = all.filter(v => v.status === 'active');
			const hidden = all.filter(v => v.status === 'hidden');
			
			return {
				total: all.length,
				active: active.length,
				hidden: hidden.length
			};
		}
	}
	
	
	/**
	 * Check if backend is available
	 */
	async function checkBackendHealth() {
			if (!USE_BACKEND) {
				return false;
			}
			try {
				const response = await fetch(`${API_URL}/health`);
				const data = await response.json();
				console.log(' Backend is online:', data.message);
				return true;
			} catch (error) {
				console.warn(' Backend is offline, using cached data');
				return false;
			}
	}

	// Retry any pending deletes when online
	async function retryPendingDeletes() {
		const db = window.firebaseDb || null;
		if (!db || !canUseFirebase()) return;
		let pending = loadPendingDeletes();
		if (!pending.length) return;
		console.log(` Retrying ${pending.length} pending vehicle deletes`);
		const stillPending = [];
		for (const id of pending) {
			try {
				await db.collection('vehicles').doc(String(id)).delete();
				console.log(` Pending delete completed for ${id}`);
			} catch (e) {
				console.warn(` Pending delete failed for ${id}:`, e.message || e);
				stillPending.push(id);
			}
		}
		savePendingDeletes(stillPending);
	}
	
	// Public API
	return {
		getAllVehicles,
		getUserVehicles,
		getActiveVehicles: getActiveVehiclesFn,
		getVehicleById,
		canAddVehicle,
		addVehicle,
		updateVehicle,
		deleteVehicle,
		setVehicleStatus,
		getStats,
		checkBackendHealth
	};
})();

// Make it globally available
window.VehicleStore = VehicleStore;
// Legacy global shims for pages that call functions directly
if (typeof window.getActiveVehicles === 'undefined') {
	window.getActiveVehicles = function() { return window.VehicleStore.getActiveVehicles.apply(window.VehicleStore, arguments); };
}

// Retry any pending deletes when online (via VehicleStore method)
async function retryPendingDeletes() {
	const db = window.firebaseDb || null;
	if (!db) return;
	try {
		const pending = JSON.parse(localStorage.getItem('CJF_PENDING_DELETES') || '[]');
		if (!pending.length) return;
		console.log(` Retrying ${pending.length} pending vehicle deletes`);
		const stillPending = [];
		for (const id of pending) {
			try {
				await db.collection('vehicles').doc(String(id)).delete();
				console.log(` Pending delete completed for ${id}`);
			} catch (e) {
				console.warn(` Pending delete failed for ${id}:`, e.message || e);
				stillPending.push(id);
			}
		}
		localStorage.setItem('CJF_PENDING_DELETES', JSON.stringify(stillPending));
	} catch (e) {
		console.warn('Retry pending deletes error:', e.message);
	}
}
if (typeof window.getAllVehicles === 'undefined') {
	window.getAllVehicles = function() { return window.VehicleStore.getAllVehicles.apply(window.VehicleStore, arguments); };
}
if (typeof window.getVehicleById === 'undefined') {
	window.getVehicleById = function() { return window.VehicleStore.getVehicleById.apply(window.VehicleStore, arguments); };
}

// Check backend health on load
if (typeof VehicleStore !== 'undefined' && USE_BACKEND) {
	VehicleStore.checkBackendHealth().then(isOnline => {
		if (isOnline) {
			console.log(' VehicleStore initialized - Connected to backend database');
		} else {
			console.log(' VehicleStore initialized - Using offline cache mode');
		}
	});
} else {
	console.log(' VehicleStore initialized - Using Firebase');
}

// Retry pending deletes once Firebase is available
setTimeout(() => {
	if (window.firebaseDb) {
		retryPendingDeletes();
	}
}, 500);
