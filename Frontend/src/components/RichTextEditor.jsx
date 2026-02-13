import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import RewriteMenu from './RewriteMenu';
import './RichTextEditor.css';

const RichTextEditor = ({ content, onChange, placeholder = 'Write something...', className = '', editorUpdateTrigger }) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder,
            }),
            Highlight,
            BubbleMenuExtension, // Add extension here
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-invert focus:outline-none max-w-none',
            },
        },
    });

    // Update content when triggered externally (e.g. regeneration)
    useEffect(() => {
        if (editor && content) {
            editor.commands.setContent(content);
        }
    }, [editorUpdateTrigger, editor]);

    return (
        <div className={`rich-text-editor ${className}`}>
            <div className="editor-content-wrapper">
                {editor && <RewriteMenu editor={editor} />}
                <EditorContent editor={editor} className="editor-content-area" />
            </div>
        </div>
    );
};

export default RichTextEditor;
