# Firestore Backend Integration Setup

## Step 1: Get Your Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **cjf-rentals**
3. Click **⚙️ Settings** (gear icon) → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the JSON file as `serviceAccountKey.json` in the `server/` directory

## Step 2: File Structure

After downloading, your `server/` folder should look like:
```
server/
├── serviceAccountKey.json  ← Place the downloaded file here
├── server.js
├── package.json
├── data/
│   ├── vehicles.json
│   ├── users.json
│   └── bookings.json
```

## Step 3: Verify Connection

The backend will now:
- ✅ Read from Firestore for vehicles, users, bookings
- ✅ Write all data to Firestore (not just local JSON)
- ✅ Fallback to local JSON if Firestore is unavailable
- ✅ Keep frontend and backend data synchronized

## Step 4: Restart Server

```bash
npm start
```

## Important Notes

- **Never commit `serviceAccountKey.json`** to version control
- Add to `.gitignore`: `serviceAccountKey.json`
- The key gives full database access - keep it secure
- Both frontend and backend now sync through Firestore

## Testing

After setup:
1. Add a vehicle through the app
2. Check Firestore Console → vehicles collection
3. Data should appear in both places

