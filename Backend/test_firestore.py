"""
Test script to verify Firestore connectivity and save functionality
"""
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import os

def test_firestore():
    print("=" * 60)
    print("FIRESTORE CONNECTIVITY TEST")
    print("=" * 60)
    
    # Check credentials file
    cred_path = 'firebase-credentials.json'
    print(f"\n1. Checking credentials file...")
    if os.path.exists(cred_path):
        print(f"   ✓ Credentials file found: {cred_path}")
    else:
        print(f"   ✗ Credentials file NOT found: {cred_path}")
        return
    
    # Initialize Firebase
    print(f"\n2. Initializing Firebase Admin SDK...")
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print(f"   ✓ Firebase initialized successfully")
    except Exception as e:
        print(f"   ✗ Firebase initialization failed: {e}")
        return
    
    # Get Firestore client
    print(f"\n3. Getting Firestore client...")
    try:
        db = firestore.client()
        print(f"   ✓ Firestore client created: {db}")
    except Exception as e:
        print(f"   ✗ Firestore client creation failed: {e}")
        return
    
    # Test write operation
    print(f"\n4. Testing write operation...")
    try:
        test_data = {
            'userId': 'test_user_123',
            'title': 'Test Story',
            'genre': 'Fantasy',
            'content': 'This is a test story content.',
            'metadata': {
                'wordCount': 6,
                'characterCount': 30,
                'createdAt': datetime.utcnow().isoformat(),
                'updatedAt': datetime.utcnow().isoformat(),
                'lastEditedAt': datetime.utcnow().isoformat()
            },
            'settings': {'tone': 'Adaptive', 'length': 'Medium'},
            'status': 'draft'
        }
        
        doc_ref = db.collection('stories').document()
        doc_ref.set(test_data)
        test_id = doc_ref.id
        print(f"   ✓ Test document created with ID: {test_id}")
        
        # Verify write
        print(f"\n5. Verifying write operation...")
        doc = doc_ref.get()
        if doc.exists:
            print(f"   ✓ Document verified in Firestore")
            print(f"   Data: {doc.to_dict()}")
        else:
            print(f"   ✗ Document NOT found in Firestore")
            
        # Clean up test document
        print(f"\n6. Cleaning up test document...")
        doc_ref.delete()
        print(f"   ✓ Test document deleted")
        
        print(f"\n{'=' * 60}")
        print("✓ ALL TESTS PASSED - Firestore is working correctly!")
        print("=" * 60)
        
    except Exception as e:
        print(f"   ✗ Write operation failed: {e}")
        import traceback
        traceback.print_exc()
        return

if __name__ == "__main__":
    test_firestore()
