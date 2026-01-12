# Quick Start: Firebase Authentication

## Prerequisites Installed ✓
- ✅ Firebase SDK (frontend)
- ✅ Firebase Admin SDK (backend)

## Next Steps to Enable Auth

### 1. Set Up Firebase Project (5 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Enable **Authentication** > **Email/Password** and **Google**

### 2. Configure Frontend (2 minutes)

Edit `Frontend/src/firebase/config.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",              // Copy from Firebase Console
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

Get these values from: **Firebase Console** > **Project Settings** > **General** > **Your apps** > **Web app**

### 3. Configure Backend (3 minutes)

1. In Firebase Console: **Project Settings** > **Service Accounts**
2. Click **Generate New Private Key**
3. Save the downloaded JSON as `Backend/firebase-credentials.json`

⚠️ **Important**: This file contains secrets! It's already in `.gitignore`

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd Backend
.\venv_gpu\Scripts\activate
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd Frontend
npm run dev
```

### 5. Test Authentication

1. Open `http://localhost:5173`
2. Click **Sign Up** to create an account
3. Try logging in
4. Test Google Sign-In
5. Access protected features (Story Editor)

## Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Landing page |
| `/login` | Public | Login page |
| `/signup` | Public | Registration page |
| `/edit` | Protected | Story editor (requires auth) |
| `/dashboard` | Protected | User dashboard (requires auth) |

## API Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/health` | GET | No | Health check |
| `/generate` | POST | **Yes** | Generate story |
| `/user/me` | GET | **Yes** | Get user info |

## Authentication Features

✅ **Implemented:**
- Email/Password registration and login
- Google Sign-In
- Protected routes
- Authenticated API requests
- User session persistence
- Logout functionality
- User info display in navbar

## Need Help?

- 📚 **Full Setup Guide**: See [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- 📋 **Summary**: See [FIREBASE_INTEGRATION_SUMMARY.md](FIREBASE_INTEGRATION_SUMMARY.md)
- 🔍 **Troubleshooting**: Check the troubleshooting section in FIREBASE_SETUP.md

## Verification Checklist

Before you're done, make sure:
- [ ] Firebase project created
- [ ] Authentication methods enabled (Email & Google)
- [ ] `Frontend/src/firebase/config.js` updated with your credentials
- [ ] `Backend/firebase-credentials.json` downloaded and in place
- [ ] Both frontend and backend start without errors
- [ ] Can create a new account
- [ ] Can log in with created account
- [ ] Can access protected routes when logged in
- [ ] Redirected to login when accessing protected routes while logged out

---

**Status**: ⚠️ Firebase configuration needed - Update config files with your Firebase project credentials to activate authentication.
