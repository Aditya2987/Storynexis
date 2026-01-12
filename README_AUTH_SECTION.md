# Firebase Authentication - README Addition

Add this section to your main README.md:

---

## 🔐 Authentication

Storynexis now includes Firebase Authentication for secure user management.

### Features
- 📧 Email/Password authentication
- 🔐 Google Sign-In integration
- 🛡️ Protected routes and API endpoints
- 👤 User profile management
- 🔄 Session persistence

### Setup

1. **Install Dependencies**
   ```bash
   # Frontend
   cd Frontend
   npm install
   
   # Backend
   cd Backend
   pip install -r requirements.txt
   ```

2. **Configure Firebase**
   - Follow the detailed guide in [QUICK_START_AUTH.md](QUICK_START_AUTH.md)
   - Or see comprehensive instructions in [FIREBASE_SETUP.md](FIREBASE_SETUP.md)

3. **Quick Setup**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Email/Password and Google authentication
   - Update `Frontend/src/firebase/config.js` with your Firebase credentials
   - Download service account key and save as `Backend/firebase-credentials.json`

### Usage

**Sign Up:**
```
Navigate to /signup or click "Sign Up" from the landing page
```

**Login:**
```
Navigate to /login or click "Sign In" from the landing page
```

**Access Protected Features:**
```
Authenticated users can access:
- Story Editor (/edit)
- Dashboard (/dashboard)
- Story Generation API
```

### Documentation

- 📖 [Quick Start Guide](QUICK_START_AUTH.md) - Get up and running in 10 minutes
- 📚 [Complete Setup Guide](FIREBASE_SETUP.md) - Detailed Firebase configuration
- 📋 [Integration Summary](FIREBASE_INTEGRATION_SUMMARY.md) - Technical details and file changes

### Architecture

```
Frontend                    Backend
  ↓                           ↓
Firebase Auth  ←→  Firebase Admin SDK
  (User Login)      (Token Verification)
  ↓                           ↓
Protected       →   Protected API
Components          Endpoints
```

### Security

✅ JWT token-based authentication  
✅ HTTP-only secure sessions  
✅ Protected API endpoints  
✅ CORS configuration  
✅ Credential encryption  

---

## Environment Variables (Optional)

For production or custom Firebase credentials location:

```bash
# Backend
export FIREBASE_CREDENTIALS_PATH=/path/to/firebase-credentials.json

# Frontend - Use Vite env variables if needed
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
```

---
