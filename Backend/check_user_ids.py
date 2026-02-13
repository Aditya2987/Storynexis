"""
Check what userId values are stored in Firestore stories
"""
import firebase_admin
from firebase_admin import credentials, firestore
import os

# Initialize Firebase if not already done
try:
    app = firebase_admin.get_app()
    print("Firebase already initialized")
except ValueError:
    cred_path = 'firebase-credentials.json'
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("Firebase initialized")
    else:
        print(f"Error: {cred_path} not found")
        exit(1)

# Get Firestore client
db = firestore.client()

print("\n" + "="*70)
print(" CHECKING FIRESTORE STORIES")
print("="*70 + "\n")

# Get all stories
stories_ref = db.collection('stories')
stories = stories_ref.stream()

story_count = 0
user_ids = {}

for story in stories:
    story_count += 1
    data = story.to_dict()
    user_id = data.get('userId', 'MISSING')
    title = data.get('title', 'Untitled')
    
    # Count stories per userId
    if user_id not in user_ids:
        user_ids[user_id] = []
    user_ids[user_id].append({
        'id': story.id,
        'title': title,
        'genre': data.get('genre', 'Unknown')
    })
    
    print(f"Story ID: {story.id}")
    print(f"  Title: {title}")
    print(f"  User ID: {user_id}")
    print(f"  Genre: {data.get('genre', 'Unknown')}")
    print(f"  Created: {data.get('metadata', {}).get('createdAt', 'Unknown')}")
    print()

print("="*70)
print(f"Total stories: {story_count}")
print(f"\nStories by User ID:")
for uid, stories_list in user_ids.items():
    print(f"\n  User ID: {uid}")
    print(f"  Story count: {len(stories_list)}")
    for s in stories_list:
        print(f"    - {s['title']} ({s['genre']})")

print("\n" + "="*70)
print("\nTo fix userId mismatch:")
print("1. Check what UID your logged-in user has")
print("2. Update stories to use that UID")
print("3. Or ensure backend uses consistent UID")
print("="*70 + "\n")
