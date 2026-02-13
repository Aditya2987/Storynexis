"""
Update story ownership - Transfer stories from one userId to another
Useful for migrating "guest" stories to a real user account
"""
import firebase_admin
from firebase_admin import credentials, firestore
import os

# Initialize Firebase
try:
    app = firebase_admin.get_app()
except ValueError:
    cred_path = 'firebase-credentials.json'
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        print(f"Error: {cred_path} not found")
        exit(1)

db = firestore.client()

print("\n" + "="*70)
print(" UPDATE STORY OWNERSHIP")
print("="*70 + "\n")

# Step 1: Show current stories
print("Current stories in Firestore:\n")
stories_ref = db.collection('stories')
all_stories = list(stories_ref.stream())

if not all_stories:
    print("No stories found in Firestore!")
    exit(0)

user_ids = {}
for story in all_stories:
    data = story.to_dict()
    user_id = data.get('userId', 'MISSING')
    if user_id not in user_ids:
        user_ids[user_id] = []
    user_ids[user_id].append({
        'id': story.id,
        'title': data.get('title', 'Untitled')
    })

for uid, stories_list in user_ids.items():
    print(f"User ID: {uid}")
    print(f"  Stories: {len(stories_list)}")
    for s in stories_list:
        print(f"    - {s['title']} (ID: {s['id']})")
    print()

# Step 2: Ask which userId to update FROM
print("="*70)
print("\nEnter the userId to transfer FROM (e.g., 'guest'):")
from_user_id = input("> ").strip()

if from_user_id not in user_ids:
    print(f"\nError: No stories found for userId '{from_user_id}'")
    exit(1)

stories_to_update = user_ids[from_user_id]
print(f"\nFound {len(stories_to_update)} stories to transfer:")
for s in stories_to_update:
    print(f"  - {s['title']}")

# Step 3: Ask which userId to update TO
print("\nEnter the userId to transfer TO (your real Firebase UID):")
print("(You can find this in Firebase Console → Authentication)")
to_user_id = input("> ").strip()

if not to_user_id:
    print("\nError: Target userId cannot be empty")
    exit(1)

# Step 4: Confirm
print(f"\n" + "="*70)
print(f"CONFIRMATION")
print("="*70)
print(f"Transfer {len(stories_to_update)} stories")
print(f"FROM userId: {from_user_id}")
print(f"TO userId:   {to_user_id}")
print("\nAre you sure? (yes/no)")
confirm = input("> ").strip().lower()

if confirm != 'yes':
    print("\nCancelled. No changes made.")
    exit(0)

# Step 5: Update stories
print(f"\nUpdating stories...")
updated_count = 0

for story_info in stories_to_update:
    try:
        story_id = story_info['id']
        doc_ref = db.collection('stories').document(story_id)
        doc_ref.update({'userId': to_user_id})
        print(f"  ✓ Updated: {story_info['title']}")
        updated_count += 1
    except Exception as e:
        print(f"  ✗ Failed to update {story_info['title']}: {e}")

print(f"\n" + "="*70)
print(f"✅ Successfully updated {updated_count} out of {len(stories_to_update)} stories")
print(f"All stories now belong to userId: {to_user_id}")
print("="*70 + "\n")

print("Next steps:")
print("1. Restart your backend server")
print("2. Refresh your profile/dashboard")
print("3. Your stories should now appear!")
print()
