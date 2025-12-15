const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin
let db = null;
let firestoreReady = false;

const initFirestore = () => {
  try {
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    if (!fs.existsSync(serviceAccountPath)) {
      console.warn('⚠️  serviceAccountKey.json not found. Using local JSON files only.');
      console.warn('    To enable Firestore: See server/FIRESTORE_SETUP.md');
      firestoreReady = false;
      return;
    }

    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    db = admin.firestore();
    firestoreReady = true;
    console.log('✅ Firestore connected successfully');
  } catch (error) {
    console.warn('⚠️  Firestore initialization failed:', error.message);
    console.warn('    Falling back to local JSON files');
    firestoreReady = false;
  }
};

initFirestore();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Database file paths
const DB_DIR = path.join(__dirname, 'data');
const VEHICLES_DB = path.join(DB_DIR, 'vehicles.json');
const USERS_DB = path.join(DB_DIR, 'users.json');
const BOOKINGS_DB = path.join(DB_DIR, 'bookings.json');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database files if they don't exist
const initDB = () => {
  if (!fs.existsSync(VEHICLES_DB)) {
    // PRODUCTION: Start with empty vehicles collection
    // Vehicles must be created by real hosts through the app
    fs.writeFileSync(VEHICLES_DB, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(USERS_DB)) {
    fs.writeFileSync(USERS_DB, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(BOOKINGS_DB)) {
    fs.writeFileSync(BOOKINGS_DB, JSON.stringify([], null, 2));
  }
};

initDB();

const REVIEW_TOKEN_TTL_DAYS = 14;
const MIN_REVIEW_COMMENT_LENGTH = 20;

const ensureFirestoreAvailable = (res) => {
  if (!firestoreReady || !db) {
    res.status(503).json({
      success: false,
      error: 'Firestore unavailable',
      message: 'Please ensure Firebase credentials are configured on the server.'
    });
    return false;
  }
  return true;
};

// ==================== AUTHENTICATION & AUTHORIZATION ====================

/**
 * Extract user from request header
 * Client sends: Authorization: Bearer {userId}
 */
const extractUser = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const userId = authHeader.substring(7);
    return { id: userId };
  } catch (error) {
    return null;
  }
};

/**
 * Middleware: Require authentication
 */
const requireAuth = (req, res, next) => {
  const user = extractUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please provide a valid authorization token'
    });
  }
  req.user = user;
  next();
};

/**
 * Check if user owns a resource
 */
const isOwner = (req, resourceHostId) => {
  return req.user && req.user.id === resourceHostId;
};

/**
 * Check if user is admin
 */
const isAdmin = (req) => {
  return req.user && req.user.id === 'admin';
};

/**
 * Middleware: Check ownership or admin
 */
const requireOwnerOrAdmin = (resourceHostId) => {
  return (req, res, next) => {
    if (!isOwner(req, resourceHostId) && !isAdmin(req)) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: 'You do not have permission to modify this resource'
      });
    }
    next();
  };
};

// Helper functions to read/write data
const readData = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
};

const writeData = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
};

// ==================== HEALTH CHECK ====================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.json({
    status: 'ok',
    message: 'CCR Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// ==================== VEHICLE ROUTES ====================

// GET all vehicles
app.get('/api/vehicles', async (req, res) => {
  try {
    const { status, country, state, city, category, hostId } = req.query;
    
    let vehicles = [];

    // Try Firestore first
    if (firestoreReady && db) {
      try {
        const snapshot = await db.collection('vehicles').get();
        vehicles = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.warn('Firestore read error:', error.message);
        vehicles = readData(VEHICLES_DB);
      }
    } else {
      vehicles = readData(VEHICLES_DB);
    }

    let filtered = vehicles;

    if (status) {
      filtered = filtered.filter(v => v.status === status);
    }
    if (country) {
      filtered = filtered.filter(v => v.country?.toLowerCase().includes(country.toLowerCase()));
    }
    if (state) {
      filtered = filtered.filter(v => v.state?.toLowerCase().includes(state.toLowerCase()));
    }
    if (city) {
      filtered = filtered.filter(v => v.city?.toLowerCase().includes(city.toLowerCase()));
    }
    if (category) {
      filtered = filtered.filter(v => v.category?.toLowerCase() === category.toLowerCase());
    }
    if (hostId) {
      filtered = filtered.filter(v => v.hostId === hostId);
    }

    res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET single vehicle by ID
app.get('/api/vehicles/:id', async (req, res) => {
  try {
    let vehicle = null;

    // Try Firestore first
    if (firestoreReady && db) {
      try {
        const doc = await db.collection('vehicles').doc(req.params.id).get();
        if (doc.exists) {
          vehicle = { id: doc.id, ...doc.data() };
        }
      } catch (error) {
        console.warn('Firestore read error:', error.message);
      }
    }

    // Fallback to local JSON
    if (!vehicle) {
      const vehicles = readData(VEHICLES_DB);
      vehicle = vehicles.find(v => v.id == req.params.id);
    }

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
        message: `No vehicle with ID ${req.params.id}`
      });
    }

    res.set('Content-Type', 'application/json');
    res.json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST create new vehicle (requires authentication)
app.post('/api/vehicles', requireAuth, async (req, res) => {
  try {
    const newVehicle = {
      id: uuidv4(),
      ...req.body,
      status: req.body.status || 'active',
      hostId: req.user.id, // Set to current user
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Validate required fields
    const requiredFields = ['year', 'make', 'model', 'category', 'country', 'state', 'city', 'price', 'frequency', 'fuel', 'insurance'];
    const missingFields = requiredFields.filter(field => !newVehicle[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Save to Firestore if available
    if (firestoreReady && db) {
      try {
        await db.collection('vehicles').doc(newVehicle.id).set(newVehicle);
      } catch (error) {
        console.warn('Firestore write failed:', error.message);
        // Continue with local storage as fallback
      }
    }

    // Always save to local JSON as backup
    const vehicles = readData(VEHICLES_DB);
    vehicles.push(newVehicle);
    writeData(VEHICLES_DB, vehicles);

    console.log(`✅ Vehicle created by user ${req.user.id}`);
    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: newVehicle
    });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vehicle',
      error: error.message
    });
  }
});

// PUT update vehicle (requires ownership)
app.put('/api/vehicles/:id', requireAuth, async (req, res) => {
  try {
    const vehicles = readData(VEHICLES_DB);
    const index = vehicles.findIndex(v => v.id == req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check ownership
    const vehicle = vehicles[index];
    if (!isOwner({ user: req.user }, vehicle.hostId) && !isAdmin(req)) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: 'You can only edit your own vehicles'
      });
    }

    const updatedVehicle = {
      ...vehicles[index],
      ...req.body,
      id: vehicles[index].id, // Preserve ID
      hostId: vehicles[index].hostId, // Preserve host
      createdAt: vehicles[index].createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };

    vehicles[index] = updatedVehicle;

    // Update Firestore if available
    if (firestoreReady && db) {
      try {
        await db.collection('vehicles').doc(req.params.id).update(updatedVehicle);
      } catch (error) {
        console.warn('Firestore update failed:', error.message);
      }
    }

    writeData(VEHICLES_DB, vehicles);
    console.log(`✅ Vehicle ${req.params.id} updated by user ${req.user.id}`);
    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: updatedVehicle
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle',
      error: error.message
    });
  }
});

// PATCH update vehicle status (requires ownership)
app.patch('/api/vehicles/:id/status', requireAuth, async (req, res) => {
  try {
    const vehicles = readData(VEHICLES_DB);
    const index = vehicles.findIndex(v => v.id == req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check ownership
    const vehicle = vehicles[index];
    if (!isOwner({ user: req.user }, vehicle.hostId) && !isAdmin(req)) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: 'You can only modify your own vehicles'
      });
    }

    const { status } = req.body;
    if (!['active', 'hidden'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "active" or "hidden"'
      });
    }

    vehicles[index].status = status;
    vehicles[index].updatedAt = new Date().toISOString();

    // Update Firestore if available
    if (firestoreReady && db) {
      try {
        await db.collection('vehicles').doc(req.params.id).update({ status, updatedAt: vehicles[index].updatedAt });
      } catch (error) {
        console.warn('Firestore update failed:', error.message);
      }
    }

    writeData(VEHICLES_DB, vehicles);
    console.log(`✅ Vehicle ${req.params.id} status changed to ${status} by user ${req.user.id}`);
    res.json({
      success: true,
      message: 'Vehicle status updated successfully',
      data: vehicles[index]
    });
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle status',
      error: error.message
    });
  }
});

// DELETE vehicle (requires ownership)
app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    const vehicles = readData(VEHICLES_DB);
    const index = vehicles.findIndex(v => v.id == req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const deleted = vehicles.splice(index, 1)[0];

    // Delete from Firestore if available
    if (firestoreReady && db) {
      try {
        await db.collection('vehicles').doc(req.params.id).delete();
      } catch (error) {
        console.warn('Firestore delete failed:', error.message);
      }
    }

    writeData(VEHICLES_DB, vehicles);
    console.log(`✅ Vehicle ${req.params.id} deleted`);
    res.json({
      success: true,
      message: 'Vehicle deleted successfully',
      data: deleted
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vehicle',
      error: error.message
    });
  }
});

// GET vehicle statistics
app.get('/api/vehicles/stats/summary', (req, res) => {
  const vehicles = readData(VEHICLES_DB);
  
  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    hidden: vehicles.filter(v => v.status === 'hidden').length,
    byCategory: {},
    byCountry: {},
    averagePrice: 0
  };

  vehicles.forEach(v => {
    // Count by category
    stats.byCategory[v.category] = (stats.byCategory[v.category] || 0) + 1;
    
    // Count by country
    stats.byCountry[v.country] = (stats.byCountry[v.country] || 0) + 1;
  });

  // Calculate average price
  if (vehicles.length > 0) {
    stats.averagePrice = Math.round(
      vehicles.reduce((sum, v) => sum + (v.price || 0), 0) / vehicles.length
    );
  }

  res.json({
    success: true,
    data: stats
  });
});

// ==================== USER ROUTES ====================

// GET all users
app.get('/api/users', (req, res) => {
  const users = readData(USERS_DB);
  res.json({
    success: true,
    count: users.length,
    data: users
  });
});

// POST create user
app.post('/api/users', (req, res) => {
  const users = readData(USERS_DB);
  
  const newUser = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  users.push(newUser);
  
  if (writeData(USERS_DB, users)) {
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// ==================== BOOKING ROUTES ====================

// GET all bookings
app.get('/api/bookings', (req, res) => {
  const bookings = readData(BOOKINGS_DB);
  res.json({
    success: true,
    count: bookings.length,
    data: bookings
  });
});

// POST create booking
app.post('/api/bookings', (req, res) => {
  const bookings = readData(BOOKINGS_DB);
  
  const newBooking = {
    id: uuidv4(),
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  bookings.push(newBooking);
  
  if (writeData(BOOKINGS_DB, bookings)) {
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: newBooking
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to create booking'
    });
  }
});

// ==================== REVIEW ROUTES ====================

app.post('/api/review-tokens', requireAuth, async (req, res) => {
  if (!ensureFirestoreAvailable(res)) return;
  const { vehicleId, customerLabel } = req.body || {};
  const tokenId = uuidv4();
  const createdAt = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + REVIEW_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000));
  const tokenData = {
    hostId: req.user.id,
    vehicleId: vehicleId || null,
    createdAt,
    expiresAt,
    used: false,
    usedAt: null,
    createdByHostUid: req.user.id,
    customerLabel: customerLabel?.trim() || null
  };

  try {
    await db.collection('reviewTokens').doc(tokenId).set(tokenData);
    res.status(201).json({
      success: true,
      token: tokenId,
      expiresAt: expiresAt.toDate().toISOString()
    });
  } catch (error) {
    console.error('Error creating review token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create review token',
      message: error.message
    });
  }
});

app.get('/api/review-tokens/:token', async (req, res) => {
  if (!ensureFirestoreAvailable(res)) return;
  const tokenId = req.params.token;
  if (!tokenId) {
    return res.status(400).json({ success: false, error: 'Missing token' });
  }

  try {
    const tokenSnap = await db.collection('reviewTokens').doc(tokenId).get();
    if (!tokenSnap.exists) {
      return res.status(404).json({ success: false, error: 'Token not found' });
    }

    const tokenData = tokenSnap.data();
    if (tokenData.used) {
      return res.status(400).json({ success: false, error: 'Token already used' });
    }
    const expiresAtMillis = tokenData.expiresAt?.toMillis
      ? tokenData.expiresAt.toMillis()
      : new Date(tokenData.expiresAt).getTime();

    if (expiresAtMillis <= Date.now()) {
      return res.status(400).json({ success: false, error: 'Token expired' });
    }

    const hostSnap = await db.collection('users').doc(tokenData.hostId).get();
    const hostName = hostSnap.exists
      ? hostSnap.data().displayName || hostSnap.data().name || 'Host'
      : 'Host';

    res.json({
      success: true,
      data: {
        hostId: tokenData.hostId,
        hostName,
        vehicleId: tokenData.vehicleId || null,
        expiresAt: new Date(expiresAtMillis).toISOString(),
        customerLabel: tokenData.customerLabel || null
      }
    });
  } catch (error) {
    console.error('Error fetching review token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch token',
      message: error.message
    });
  }
});

app.post('/api/reviews/submit', async (req, res) => {
  if (!ensureFirestoreAvailable(res)) return;
  const { token, rating, comment, displayName, firstName, lastName, email } = req.body || {};
  if (!token) {
    return res.status(400).json({ success: false, error: 'Missing review token' });
  }

  const ratingValue = Number.parseInt(rating, 10);
  if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
    return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
  }

  const trimmedComment = (comment || '').trim();
  if (trimmedComment && trimmedComment.length < MIN_REVIEW_COMMENT_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `Review text must be at least ${MIN_REVIEW_COMMENT_LENGTH} characters`
    });
  }

  try {
    await db.runTransaction(async (tx) => {
      const tokenRef = db.collection('reviewTokens').doc(token);
      const tokenSnap = await tx.get(tokenRef);
      if (!tokenSnap.exists) {
        throw new Error('Review token not found');
      }

      const tokenData = tokenSnap.data();
      if (tokenData.used) {
        throw new Error('Review token already used');
      }

      const expiresAtMillis = tokenData.expiresAt?.toMillis
        ? tokenData.expiresAt.toMillis()
        : new Date(tokenData.expiresAt).getTime();

      if (expiresAtMillis <= Date.now()) {
        throw new Error('Review token expired');
      }

      const hostId = tokenData.hostId;
      const hostRef = db.collection('hosts').doc(hostId);
      const userRef = db.collection('users').doc(hostId);
      const reviewRef = hostRef.collection('reviews').doc();
      const now = admin.firestore.Timestamp.now();
      const safeDisplayName = (displayName || '').trim() || 'Anonymous';

      tx.set(reviewRef, {
        rating: ratingValue,
        comment: trimmedComment || null,
        displayName: safeDisplayName,
        firstName: (firstName || '').trim() || null,
        lastName: (lastName || '').trim() || null,
        hostId,
        vehicleId: tokenData.vehicleId || null,
        verified: true,
        token,
        email: (email || '').trim() || null,
        createdAt: now,
        customerLabel: tokenData.customerLabel || null
      });

      const hostSnapshot = await tx.get(hostRef);
      const hostCount = hostSnapshot.exists ? hostSnapshot.data().ratingCount || 0 : 0;
      const hostAvg = hostSnapshot.exists ? hostSnapshot.data().ratingAvg || 0 : 0;
      const newCount = hostCount + 1;
      const newAvg = Number((((hostAvg * hostCount) + ratingValue) / newCount).toFixed(2));

      tx.set(hostRef, { ratingAvg: newAvg, ratingCount: newCount }, { merge: true });
      tx.set(userRef, { ratingAvg: newAvg, ratingCount: newCount }, { merge: true });
      tx.update(tokenRef, { used: true, usedAt: now });
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Review submit error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to submit review'
    });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'CCR Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Car Connect Rentals API',
    version: '1.0.0',
    endpoints: {
      vehicles: '/api/vehicles',
      users: '/api/users',
      bookings: '/api/bookings',
      health: '/api/health'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 CCR Backend Server running on http://localhost:${PORT}`);
  console.log(`📊 API Endpoints:`);
  console.log(`   GET    http://localhost:${PORT}/api/vehicles`);
  console.log(`   POST   http://localhost:${PORT}/api/vehicles`);
  console.log(`   PUT    http://localhost:${PORT}/api/vehicles/:id`);
  console.log(`   DELETE http://localhost:${PORT}/api/vehicles/:id`);
  console.log(`   PATCH  http://localhost:${PORT}/api/vehicles/:id/status`);
  console.log(`   GET    http://localhost:${PORT}/api/vehicles/stats/summary`);
  console.log(`\n💾 Database files located in: ${DB_DIR}\n`);
});

module.exports = app;
