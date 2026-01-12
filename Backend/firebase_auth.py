import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import os

# Dev mode - set to True to allow unauthenticated requests for testing
DEV_MODE = os.getenv('DEV_MODE', 'true').lower() == 'true'

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK with service account credentials"""
    try:
        # Path to your service account key file
        # You'll need to download this from Firebase Console
        cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH', 'firebase-credentials.json')
        
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized successfully")
        else:
            print(f"Warning: Firebase credentials file not found at {cred_path}")
            print("Authentication will not work until credentials are provided")
    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}")

security = HTTPBearer(auto_error=not DEV_MODE)  # Don't auto-error in dev mode

async def verify_firebase_token(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)):
    """
    Verify Firebase ID token from Authorization header
    Returns the decoded token if valid, raises HTTPException otherwise
    In dev mode, allows unauthenticated access
    """
    # In dev mode, allow unauthenticated access
    if DEV_MODE and credentials is None:
        return None
    
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated"
        )
    
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=401,
            detail="Authentication token has expired"
        )
    except Exception as e:
        # In dev mode, allow through even if Firebase isn't configured
        if DEV_MODE:
            print(f"Auth warning (dev mode): {e}")
            return None
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )

async def get_current_user(token_data: Optional[dict] = Security(verify_firebase_token)):
    """
    Get current user information from verified token
    In dev mode, returns a guest user if not authenticated
    """
    if token_data is None:
        if DEV_MODE:
            return {
                "uid": "guest",
                "email": "guest@localhost",
                "name": "Guest User",
                "email_verified": False
            }
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return {
        "uid": token_data.get("uid"),
        "email": token_data.get("email"),
        "name": token_data.get("name"),
        "email_verified": token_data.get("email_verified", False)
    }
