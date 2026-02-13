"""
Enhanced diagnostic script with better error handling
"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

print("Starting Firestore diagnostic...")
print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")

try:
    import firebase_admin
    print("✓ firebase_admin imported")
except ImportError as e:
    print(f"✗ Failed to import firebase_admin: {e}")
    sys.exit(1)

from firebase_admin import credentials, firestore
from datetime import datetime

def main():
    print("\n" + "=" * 60)
    print("FIRESTORE CONNECTIVITY TEST")
    print("=" * 60)
    
    # Check credentials
    cred_path = 'firebase-credentials.json'
    print(f"\n1. Checking credentials file: {cred_path}")
    if not os.path.exists(cred_path):
        print(f"   ✗ File not found!")
        return False
    print(f"   ✓ File exists")
    
    # Initialize Firebase
    print(f"\n2. Initializing Firebase...")
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print(f"   ✓ Initialized")
    except ValueError as e:
        if "already exists" in str(e):
            print(f"   ⚠ Already initialized (this is OK)")
        else:
            print(f"   ✗ Error: {e}")
            return False
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return False
    
    # Get Firestore client
    print(f"\n3. Creating Firestore client...")
    try:
        db = firestore.client()
        print(f"   ✓ Client created")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return False
    
    # Test write
    print(f"\n4. Testing WRITE operation...")
    try:
        test_doc = db.collection('stories').document('test_doc_12345')
        test_data = {
            'userId': 'test_user',
            'title': 'Test Story',
            'content': 'Test content',
            'timestamp': datetime.utcnow().isoformat()
        }
        test_doc.set(test_data)
        print(f"   ✓ Write successful")
    except Exception as e:
        print(f"   ✗ Write failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test read
    print(f"\n5. Testing READ operation...")
    try:
        doc = test_doc.get()
        if doc.exists:
            print(f"   ✓ Read successful")
            print(f"   Data: {doc.to_dict()}")
        else:
            print(f"   ✗ Document not found")
            return False
    except Exception as e:
        print(f"   ✗ Read failed: {e}")
        return False
    
    # Cleanup
    print(f"\n6. Cleaning up...")
    try:
        test_doc.delete()
        print(f"   ✓ Cleanup successful")
    except Exception as e:
        print(f"   ⚠ Cleanup warning: {e}")
    
    print(f"\n" + "=" * 60)
    print("✓✓✓ ALL TESTS PASSED ✓✓✓")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
