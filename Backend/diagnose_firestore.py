"""
Quick diagnostic script to identify Firestore save issues
Run this to see exactly what's failing
"""

import sys
import os

print("\n" + "="*70)
print(" STORYNEXIS FIRESTORE DIAGNOSTIC")
print("="*70 + "\n")

# Test 1: Check Python environment
print("TEST 1: Python Environment")
print(f"  Python version: {sys.version}")
print(f"  Current directory: {os.getcwd()}")
print("  ✓ PASS\n")

# Test 2: Check required packages
print("TEST 2: Required Packages")
required_packages = ['firebase_admin', 'google', 'fastapi', 'pydantic']
for pkg in required_packages:
    try:
        __import__(pkg)
        print(f"  ✓ {pkg} installed")
    except ImportError:
        print(f"  ✗ {pkg} NOT installed")
        print(f"    Fix: pip install {pkg}")
print()

# Test 3: Check credentials file
print("TEST 3: Firebase Credentials")
cred_path = 'firebase-credentials.json'
if os.path.exists(cred_path):
    print(f"  ✓ Credentials file found: {cred_path}")
    import json
    with open(cred_path) as f:
        creds = json.load(f)
        print(f"  ✓ Project ID: {creds.get('project_id')}")
        print(f"  ✓ Client email: {creds.get('client_email')}")
else:
    print(f"  ✗ Credentials file NOT found: {cred_path}")
    print(f"    Fix: Download from Firebase Console")
    sys.exit(1)
print()

# Test 4: Initialize Firebase
print("TEST 4: Firebase Initialization")
try:
    import firebase_admin
    from firebase_admin import credentials
    
    # Check if already initialized
    try:
        app = firebase_admin.get_app()
        print(f"  ⚠ Firebase already initialized (this is OK)")
    except ValueError:
        # Not initialized, initialize now
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print(f"  ✓ Firebase initialized successfully")
except Exception as e:
    print(f"  ✗ Firebase initialization failed: {e}")
    sys.exit(1)
print()

# Test 5: Get Firestore client
print("TEST 5: Firestore Client")
try:
    from firebase_admin import firestore
    db = firestore.client()
    print(f"  ✓ Firestore client created")
except Exception as e:
    print(f"  ✗ Firestore client creation failed: {e}")
    sys.exit(1)
print()

# Test 6: Test write operation
print("TEST 6: Write Operation")
try:
    from datetime import datetime
    test_id = f"diagnostic_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    test_data = {
        'userId': 'diagnostic_user',
        'title': 'Diagnostic Test Story',
        'genre': 'Test',
        'content': 'This is a diagnostic test.',
        'metadata': {
            'wordCount': 5,
            'characterCount': 26,
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat(),
            'lastEditedAt': datetime.utcnow().isoformat()
        },
        'settings': {},
        'status': 'test'
    }
    
    doc_ref = db.collection('stories').document(test_id)
    doc_ref.set(test_data)
    print(f"  ✓ Write successful - Document ID: {test_id}")
except Exception as e:
    print(f"  ✗ Write failed: {e}")
    print(f"\n  LIKELY CAUSE: Firestore Security Rules")
    print(f"  FIX: Update security rules in Firebase Console")
    print(f"       https://console.firebase.google.com/project/storynexis/firestore/rules")
    import traceback
    traceback.print_exc()
    sys.exit(1)
print()

# Test 7: Test read operation
print("TEST 7: Read Operation")
try:
    doc = doc_ref.get()
    if doc.exists:
        print(f"  ✓ Read successful")
        data = doc.to_dict()
        print(f"  ✓ Title: {data.get('title')}")
    else:
        print(f"  ✗ Document not found after write")
        sys.exit(1)
except Exception as e:
    print(f"  ✗ Read failed: {e}")
    sys.exit(1)
print()

# Test 8: Cleanup
print("TEST 8: Cleanup")
try:
    doc_ref.delete()
    print(f"  ✓ Test document deleted")
except Exception as e:
    print(f"  ⚠ Cleanup warning: {e}")
print()

# Summary
print("="*70)
print(" ✓✓✓ ALL TESTS PASSED ✓✓✓")
print("="*70)
print("\nFirestore is working correctly!")
print("If you're still experiencing issues, check:")
print("  1. Backend server logs when saving")
print("  2. Browser console for frontend errors")
print("  3. Firestore security rules in Firebase Console")
print()
