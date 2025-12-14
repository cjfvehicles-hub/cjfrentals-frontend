# Car Connect Rentals - Backend API

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Start the Server
```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

Server will run on **http://localhost:3000**

---

## 📡 API Endpoints

### Vehicles

#### Get All Vehicles
```http
GET /api/vehicles
```

**Query Parameters:**
- `status` - Filter by status (active/hidden)
- `country` - Filter by country
- `state` - Filter by state
- `city` - Filter by city
- `category` - Filter by category (SUV, Sedan, etc.)
- `hostId` - Filter by host

**Example:**
```http
GET /api/vehicles?status=active&category=SUV
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1234567890,
      "make": "Range Rover",
      "model": "Velar",
      "year": 2023,
      "price": 240,
      "status": "active",
      ...
    }
  ]
}
```

---

#### Get Single Vehicle
```http
GET /api/vehicles/:id
```

---

#### Create Vehicle
```http
POST /api/vehicles
Content-Type: application/json

{
  "year": 2023,
  "make": "Tesla",
  "model": "Model 3",
  "category": "Sedan",
  "country": "United States",
  "state": "California",
  "city": "Los Angeles",
  "price": 150,
  "frequency": "Daily",
  "fuel": "Electric",
  "insurance": "Included",
  "description": "Premium electric sedan",
  "features": "Autopilot, Premium Audio",
  "image": "path/to/image.jpg",
  "photos": ["path/to/image1.jpg", "path/to/image2.jpg"]
}
```

**Required Fields:**
- year, make, model, category
- country, state, city
- price, frequency, fuel, insurance

---

#### Update Vehicle
```http
PUT /api/vehicles/:id
Content-Type: application/json

{
  "price": 160,
  "description": "Updated description"
}
```

---

#### Update Vehicle Status
```http
PATCH /api/vehicles/:id/status
Content-Type: application/json

{
  "status": "hidden"
}
```

---

#### Delete Vehicle
```http
DELETE /api/vehicles/:id
```

---

#### Get Statistics
```http
GET /api/vehicles/stats/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "active": 8,
    "hidden": 2,
    "byCategory": {
      "SUV": 5,
      "Sedan": 3,
      "Coupe": 2
    },
    "byCountry": {
      "United Arab Emirates": 6,
      "United States": 4
    },
    "averagePrice": 195
  }
}
```

---

### Users

#### Get All Users
```http
GET /api/users
```

#### Create User
```http
POST /api/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "type": "host"
}
```

---

### Bookings

#### Get All Bookings
```http
GET /api/bookings
```

#### Create Booking
```http
POST /api/bookings
Content-Type: application/json

{
  "vehicleId": 1234567890,
  "userId": "uuid-here",
  "startDate": "2025-01-01",
  "endDate": "2025-01-05",
  "totalPrice": 960
}
```

---

### Health Check
```http
GET /api/health
```

---

## 📁 Database Structure

Data is stored in JSON files in the `server/data/` directory:

- `vehicles.json` - All vehicle listings
- `users.json` - User accounts
- `bookings.json` - Rental bookings

### Sample Vehicle Record:
```json
{
  "id": 1701869234567,
  "image": "assets - Copy/car_1.jpg",
  "photos": ["assets - Copy/car_1.jpg"],
  "year": 2023,
  "make": "Range Rover",
  "model": "Velar",
  "price": 240,
  "frequency": "Daily",
  "fuel": "Gas",
  "insurance": "Included",
  "status": "active",
  "category": "SUV",
  "country": "United Arab Emirates",
  "state": "Dubai",
  "city": "Dubai",
  "description": "Luxury SUV with premium amenities",
  "features": "Leather Seats, Sunroof, Backup Camera",
  "hostId": "default-host",
  "createdAt": "2025-12-06T10:30:00.000Z",
  "updatedAt": "2025-12-06T10:30:00.000Z"
}
```

---

## 🔧 Configuration

- **Port:** 3000 (default)
- **CORS:** Enabled for all origins
- **Body Limit:** 50MB (for image uploads)

---

## 🧪 Testing the API

### Using cURL:
```bash
# Get all vehicles
curl http://localhost:3000/api/vehicles

# Get active vehicles
curl http://localhost:3000/api/vehicles?status=active

# Create a vehicle
curl -X POST http://localhost:3000/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{"year":2024,"make":"BMW","model":"X5","category":"SUV","country":"USA","state":"CA","city":"LA","price":200,"frequency":"Daily","fuel":"Gas","insurance":"Included"}'

# Update vehicle status
curl -X PATCH http://localhost:3000/api/vehicles/1234567890/status \
  -H "Content-Type: application/json" \
  -d '{"status":"hidden"}'

# Delete vehicle
curl -X DELETE http://localhost:3000/api/vehicles/1234567890
```

### Using JavaScript (Frontend):
```javascript
// Get all active vehicles
fetch('http://localhost:3000/api/vehicles?status=active')
  .then(res => res.json())
  .then(data => console.log(data));

// Create new vehicle
fetch('http://localhost:3000/api/vehicles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    year: 2024,
    make: 'Tesla',
    model: 'Model 3',
    category: 'Sedan',
    country: 'United States',
    state: 'California',
    city: 'Los Angeles',
    price: 150,
    frequency: 'Daily',
    fuel: 'Electric',
    insurance: 'Included'
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

---

## 📦 Upgrading to Real Database

To upgrade from JSON files to a real database:

### MongoDB:
```bash
npm install mongoose
```

### PostgreSQL:
```bash
npm install pg sequelize
```

### MySQL:
```bash
npm install mysql2 sequelize
```

---

## 🛠️ Troubleshooting

**Port already in use:**
```bash
# Change PORT in server.js or use environment variable
PORT=3001 npm start
```

**CORS errors:**
- Server already has CORS enabled
- Make sure frontend makes requests to http://localhost:3000

**Database not saving:**
- Check `server/data/` directory permissions
- Ensure disk space available

---

## 📞 Support

For issues or questions, check the console logs:
```bash
npm run dev
```

All operations are logged to console with emoji indicators:
- 🚀 Server started
- ✅ Successful operations
- ❌ Errors
- 📊 Statistics
