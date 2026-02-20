"""
Firestore service module for story management.
Handles all database operations for stories including CRUD operations,
authorization checks, and metadata management.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from fastapi import HTTPException
import re

# Constants
STORIES_COLLECTION = 'stories'

# Lazy-load Firestore client to ensure Firebase is initialized first
_db = None

def get_db():
    """Get Firestore client instance (lazy initialization)."""
    global _db
    if _db is None:
        _db = firestore.client()
    return _db


def calculate_word_count(text: str) -> int:
    """Calculate word count from text (strips HTML tags first)"""
    if not text:
        return 0
    # Strip HTML tags before counting
    clean = re.sub(r'<[^>]+>', ' ', text)
    words = re.findall(r'\b\w+\b', clean)
    return len(words)


def create_story_metadata(content: str) -> Dict[str, Any]:
    """Create metadata for a story"""
    now = datetime.utcnow().isoformat()
    return {
        'wordCount': calculate_word_count(content),
        'characterCount': len(content) if content else 0,
        'createdAt': now,
        'updatedAt': now,
        'lastEditedAt': now
    }


def update_story_metadata(existing_metadata: Dict[str, Any], content: str) -> Dict[str, Any]:
    """Update metadata for an existing story"""
    now = datetime.utcnow().isoformat()
    return {
        **existing_metadata,
        'wordCount': calculate_word_count(content),
        'characterCount': len(content) if content else 0,
        'updatedAt': now,
        'lastEditedAt': now
    }


def calculate_chapter_metadata(content: str) -> Dict[str, Any]:
    """Calculate metadata for a single chapter"""
    now = datetime.utcnow().isoformat()
    return {
        'wordCount': calculate_word_count(content),
        'characterCount': len(content) if content else 0,
        'createdAt': now,
        'updatedAt': now
    }


def aggregate_story_metadata_from_chapters(chapters: List[Dict[str, Any]], existing_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Aggregate metadata from all chapters"""
    if not chapters:
        return existing_metadata or create_story_metadata("")
    
    total_words = sum(ch.get('metadata', {}).get('wordCount', 0) for ch in chapters)
    total_chars = sum(ch.get('metadata', {}).get('characterCount', 0) for ch in chapters)
    
    # Get earliest createdAt and latest updatedAt
    created_dates = [ch.get('metadata', {}).get('createdAt', '') for ch in chapters if ch.get('metadata', {}).get('createdAt')]
    updated_dates = [ch.get('metadata', {}).get('updatedAt', '') for ch in chapters if ch.get('metadata', {}).get('updatedAt')]
    
    now = datetime.utcnow().isoformat()
    created_at = min(created_dates) if created_dates else (existing_metadata or {}).get('createdAt', now)
    updated_at = max(updated_dates) if updated_dates else now
    
    return {
        'wordCount': total_words,
        'characterCount': total_chars,
        'chapterCount': len(chapters),
        'createdAt': created_at,
        'updatedAt': updated_at,
        'lastEditedAt': now
    }


async def create_story(
    user_id: str,
    title: str,
    genre: str,
    content: str = "",
    chapters: Optional[List[Dict[str, Any]]] = None,
    settings: Optional[Dict[str, Any]] = None,
    status: str = "draft"
) -> Dict[str, Any]:
    """
    Create a new story in Firestore
    
    Args:
        user_id: Firebase user UID
        title: Story title
        genre: Story genre
        content: Story content (legacy field)
        chapters: List of chapters (new format)
        settings: Story settings (tone, length preferences)
        status: Story status (draft, completed, archived)
    
    Returns:
        Created story document with ID
    """
    try:
        # Process chapters if provided
        if chapters and len(chapters) > 0:
            # Ensure each chapter has metadata
            processed_chapters = []
            for ch in chapters:
                if isinstance(ch, dict):
                    chapter_dict = ch
                else:
                    chapter_dict = ch.dict() if hasattr(ch, 'dict') else dict(ch)
                
                # Calculate metadata if not provided
                if 'metadata' not in chapter_dict or not chapter_dict['metadata']:
                    chapter_dict['metadata'] = calculate_chapter_metadata(chapter_dict.get('content', ''))
                
                processed_chapters.append(chapter_dict)
            
            # Aggregate metadata from chapters
            metadata = aggregate_story_metadata_from_chapters(processed_chapters)
            
            # Sync content field with first chapter for backward compatibility
            content = processed_chapters[0].get('content', '') if processed_chapters else ''
            
            story_data = {
                'userId': user_id,
                'title': title,
                'genre': genre,
                'content': content,  # Legacy field
                'chapters': processed_chapters,
                'metadata': metadata,
                'settings': settings or {},
                'status': status
            }
        else:
            # Legacy mode: no chapters, use content field
            story_data = {
                'userId': user_id,
                'title': title,
                'genre': genre,
                'content': content,
                'chapters': [],
                'metadata': create_story_metadata(content),
                'settings': settings or {},
                'status': status
            }
        
        # Add to Firestore
        print(f"DEBUG: Attempting to create story documentation in '{STORIES_COLLECTION}'...")
        db = get_db()
        doc_ref = db.collection(STORIES_COLLECTION).document()
        
        # Explicitly check for content length to catch empty saves
        content_len = len(story_data.get('content', ''))
        print(f"DEBUG: Creating doc {doc_ref.id} for user {user_id}. Content length: {content_len}")
        
        doc_ref.set(story_data)
        print(f"✅ Success: Story document {doc_ref.id} created in Firestore.")
        
        # Return story with ID
        return {
            'id': doc_ref.id,
            **story_data
        }
    except Exception as e:
        print(f"❌ Error creating story: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create story: {str(e)}")


async def update_story(
    story_id: str,
    user_id: str,
    title: Optional[str] = None,
    genre: Optional[str] = None,
    content: Optional[str] = None,
    chapters: Optional[List[Dict[str, Any]]] = None,
    settings: Optional[Dict[str, Any]] = None,
    status: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update an existing story
    
    Args:
        story_id: Story document ID
        user_id: Firebase user UID (for authorization)
        title: Updated title
        genre: Updated genre
        content: Updated content (legacy field)
        chapters: Updated chapters (new format)
        settings: Updated settings
        status: Updated status
    
    Returns:
        Updated story document
    """
    try:
        doc_ref = get_db().collection(STORIES_COLLECTION).document(story_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Story not found")
        
        story_data = doc.to_dict()
        
        # Check authorization
        if story_data.get('userId') != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this story")
        
        # Build update data
        update_data = {}
        if title is not None:
            update_data['title'] = title
        if genre is not None:
            update_data['genre'] = genre
        
        # Handle chapters update
        if chapters is not None:
            # Process chapters
            processed_chapters = []
            for ch in chapters:
                if isinstance(ch, dict):
                    chapter_dict = ch
                else:
                    chapter_dict = ch.dict() if hasattr(ch, 'dict') else dict(ch)
                
                # Calculate/update metadata
                if 'metadata' not in chapter_dict or not chapter_dict['metadata']:
                    chapter_dict['metadata'] = calculate_chapter_metadata(chapter_dict.get('content', ''))
                else:
                    # Update existing metadata
                    now = datetime.utcnow().isoformat()
                    chapter_dict['metadata']['updatedAt'] = now
                    chapter_dict['metadata']['wordCount'] = calculate_word_count(chapter_dict.get('content', ''))
                    chapter_dict['metadata']['characterCount'] = len(chapter_dict.get('content', ''))
                
                processed_chapters.append(chapter_dict)
            
            update_data['chapters'] = processed_chapters
            
            # Aggregate metadata from chapters
            update_data['metadata'] = aggregate_story_metadata_from_chapters(
                processed_chapters,
                story_data.get('metadata', {})
            )
            
            # Sync content field with first chapter for backward compatibility
            if processed_chapters:
                update_data['content'] = processed_chapters[0].get('content', '')
        elif content is not None:
            # Legacy mode: update content field
            update_data['content'] = content
            # Update metadata when content changes
            update_data['metadata'] = update_story_metadata(
                story_data.get('metadata', {}),
                content
            )
        
        if settings is not None:
            update_data['settings'] = settings
        if status is not None:
            update_data['status'] = status
        
        # Always update the lastEditedAt timestamp
        if 'metadata' not in update_data:
            metadata = story_data.get('metadata', {})
            metadata['lastEditedAt'] = datetime.utcnow().isoformat()
            update_data['metadata'] = metadata
        
        # Update in Firestore
        print(f"DEBUG: Attempting to update story {story_id}...")
        print(f"DEBUG: Update fields: {list(update_data.keys())}")
        
        if 'content' in update_data:
            print(f"DEBUG: New content length: {len(update_data['content'])}")
            
        doc_ref.update(update_data)
        print(f"✅ Success: Story document {story_id} updated in Firestore.")
        
        # Return updated story
        updated_doc = doc_ref.get()
        return {
            'id': story_id,
            **updated_doc.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating story: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update story: {str(e)}")


async def get_story(story_id: str, user_id: str) -> Dict[str, Any]:
    """
    Get a single story by ID
    
    Args:
        story_id: Story document ID
        user_id: Firebase user UID (for authorization)
    
    Returns:
        Story document
    """
    try:
        doc_ref = get_db().collection(STORIES_COLLECTION).document(story_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Story not found")
        
        story_data = doc.to_dict()
        
        # Check authorization
        if story_data.get('userId') != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this story")
        
        return {
            'id': doc.id,
            **story_data
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting story: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get story: {str(e)}")


async def list_user_stories(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    List all stories for a user
    
    Args:
        user_id: Firebase user UID
        limit: Maximum number of stories to return
        offset: Number of stories to skip
        status: Filter by status (draft, completed, archived)
    
    Returns:
        List of story documents (without full content for performance)
    """
    try:
        # Build query - only filter by userId (no order_by to avoid composite index)
        query = get_db().collection(STORIES_COLLECTION).where('userId', '==', user_id)
        
        # Filter by status if provided
        if status:
            query = query.where('status', '==', status)
        
        # Execute query - get all matching documents
        docs = query.stream()
        
        # Build result list (exclude full content for performance)
        stories = []
        for doc in docs:
            data = doc.to_dict()
            stories.append({
                'id': doc.id,
                'userId': data.get('userId'),
                'title': data.get('title'),
                'genre': data.get('genre'),
                'metadata': data.get('metadata'),
                'settings': data.get('settings'),
                'status': data.get('status'),
                # Exclude 'content' for list view
            })
        
        # Sort by updatedAt in Python (most recent first)
        stories.sort(
            key=lambda x: x.get('metadata', {}).get('updatedAt', ''),
            reverse=True
        )
        
        # Apply pagination after sorting
        start = offset
        end = offset + limit
        stories = stories[start:end]
        
        return stories
    except Exception as e:
        print(f"Error listing stories: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list stories: {str(e)}")


async def delete_story(story_id: str, user_id: str) -> Dict[str, str]:
    """
    Delete a story
    
    Args:
        story_id: Story document ID
        user_id: Firebase user UID (for authorization)
    
    Returns:
        Success message
    """
    try:
        doc_ref = get_db().collection(STORIES_COLLECTION).document(story_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Story not found")
        
        story_data = doc.to_dict()
        
        # Check authorization
        if story_data.get('userId') != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this story")
        
        # Delete the document
        doc_ref.delete()
        
        return {
            'message': 'Story deleted successfully',
            'id': story_id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting story: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete story: {str(e)}")


# Bible (Story Items) Management

async def add_bible_item(story_id: str, item_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Add a new item to the story bible"""
    try:
        # Verify story ownership
        await get_story(story_id, user_id)
        
        # Add item to subcollection
        collection_ref = get_db().collection(STORIES_COLLECTION).document(story_id).collection('bible_items')
        doc_ref = collection_ref.document()
        
        # Add timestamps
        now = datetime.utcnow().isoformat()
        item_data['createdAt'] = now
        item_data['updatedAt'] = now
        
        doc_ref.set(item_data)
        
        return {
            'id': doc_ref.id,
            **item_data
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error adding bible item: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add bible item: {str(e)}")


async def get_bible_items(story_id: str, user_id: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get all bible items for a story"""
    try:
        # Verify story ownership
        await get_story(story_id, user_id)
        
        # Query subcollection
        collection_ref = get_db().collection(STORIES_COLLECTION).document(story_id).collection('bible_items')
        
        if category:
            query = collection_ref.where('category', '==', category)
            docs = query.stream()
        else:
            docs = collection_ref.stream()
            
        items = []
        for doc in docs:
            data = doc.to_dict()
            items.append({
                'id': doc.id,
                **data
            })
            
        return items
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting bible items: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get bible items: {str(e)}")


async def update_bible_item(story_id: str, item_id: str, item_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Update a bible item"""
    try:
        # Verify story ownership
        await get_story(story_id, user_id)
        
        doc_ref = get_db().collection(STORIES_COLLECTION).document(story_id).collection('bible_items').document(item_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Item not found")
            
        current_data = doc.to_dict()
        
        # Update fields
        update_data = {**item_data}
        update_data['updatedAt'] = datetime.utcnow().isoformat()
        
        # Don't overwrite createdAt if it was accidentally passed
        if 'createdAt' in update_data:
            del update_data['createdAt']
        
        doc_ref.update(update_data)
        
        # Merge for return
        return {
            'id': item_id,
            **current_data,
            **update_data
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating bible item: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update bible item: {str(e)}")


async def delete_bible_item(story_id: str, item_id: str, user_id: str) -> Dict[str, str]:
    """Delete a bible item"""
    try:
        # Verify story ownership
        await get_story(story_id, user_id)
        
        doc_ref = get_db().collection(STORIES_COLLECTION).document(story_id).collection('bible_items').document(item_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Item not found")
            
        doc_ref.delete()
        
        return {
            'message': 'Item deleted successfully',
            'id': item_id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting bible item: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete bible item: {str(e)}")
