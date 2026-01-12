# Firebase Authentication Setup Guide

This guide will help you integrate Firebase Authentication into the Storynexis application.

## Prerequisites

- A Google/Firebase account
- Node.js and npm installed
- Python environment with pip

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Enter your project name (e.g., "storynexis")
4. Follow the setup wizard to create your project

## Step 2: Enable Authentication Methods

1. In the Firebase Console, select your project
2. Go to **Build** > **Authentication**
3. Click on the **Sign-in method** tab
4. Enable the following providers:
   - **Email/Password**: Click on it and toggle "Enable"
   - **Google**: Click on it, toggle "Enable", and add a support email

## Step 3: Register Your Web App

1. In the Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click the **Web** icon `</>`
4. Register your app with a nickname (e.g., "Storynexis Web")
5. You'll receive a Firebase configuration object - save this for the next step

## Step 4: Configure Frontend

1. Open `Frontend/src/firebase/config.js`
2. Replace the placeholder values with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

## Step 5: Set Up Firebase Admin SDK (Backend)

1. In the Firebase Console, go to **Project Settings** > **Service Accounts**
2. Click **Generate New Private Key**
3. Download the JSON file
4. Save it as `firebase-credentials.json` in the `Backend` directory

**IMPORTANT**: Add `firebase-credentials.json` to your `.gitignore` file to prevent committing sensitive credentials!

## Step 6: Configure Backend Environment

Option A: Use default location
- Place `firebase-credentials.json` in the `Backend` directory

Option B: Use custom location
- Set an environment variable:
  ```bash
  # Windows
  set FIREBASE_CREDENTIALS_PATH=C:\path\to\your\firebase-credentials.json
  
  # Linux/Mac
  export FIREBASE_CREDENTIALS_PATH=/path/to/your/firebase-credentials.json
  ```

## Step 7: Update CORS Settings (if needed)

If you deploy your frontend to a different domain, update the CORS settings in `Backend/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://your-domain.com"  # Add your production domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Step 8: Test the Integration

1. Start the backend server:
   ```bash
   cd Backend
   .\venv_gpu\Scripts\activate  # Windows
   # or
   source venv_gpu/bin/activate  # Linux/Mac
   
   python main.py
   ```

2. Start the frontend development server:
   ```bash
   cd Frontend
   npm run dev
   ```

3. Navigate to `http://localhost:5173`
4. Try signing up with a new account
5. Try logging in with the created account
6. Test Google Sign-In

## Authentication Flow

### User Sign-Up/Login
1. User enters credentials or uses Google Sign-In
2. Firebase Authentication validates and creates a session
3. User is redirected to the dashboard

### Protected API Requests
1. Frontend retrieves the user's Firebase ID token
2. Token is sent in the `Authorization` header as `Bearer <token>`
3. Backend validates the token using Firebase Admin SDK
4. If valid, the request proceeds; otherwise, returns 401 Unauthorized

## Security Best Practices

1. **Never commit credentials**: Keep `firebase-credentials.json` and API keys secure
2. **Use environment variables**: For production, use environment variables for sensitive data
3. **Enable App Check**: Add Firebase App Check for additional security
4. **Set up Security Rules**: Configure Firestore/Storage security rules if using those services
5. **Monitor Authentication**: Regularly check the Firebase Console for suspicious activity

## Troubleshooting

### "Firebase credentials file not found"
- Ensure `firebase-credentials.json` is in the correct location
- Check the `FIREBASE_CREDENTIALS_PATH` environment variable

### "Invalid authentication token"
- Token may have expired (tokens expire after 1 hour)
- User may need to re-authenticate
- Check that the Firebase project ID matches in both frontend and backend configs

### CORS errors
- Verify your frontend URL is in the `allow_origins` list in `main.py`
- Ensure cookies are enabled in the browser

### "Authentication failed"
- Check Firebase Console > Authentication to see if the user exists
- Verify the sign-in method is enabled
- Check browser console for detailed error messages

## Optional: Add Password Reset

To add password reset functionality, use Firebase's built-in method:

```javascript
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebase/auth';

const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    // Show success message
  } catch (error) {
    // Handle error
  }
};
```

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [FastAPI Security Documentation](https://fastapi.tiangolo.com/tutorial/security/)

## Support

For issues or questions, check the Firebase Console logs and browser developer console for error messages.
