import React, { useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import { rewriteText } from '../utils/api';
import './RichTextEditor.css'; // Reuse existing styles or add new ones

const RewriteMenu = ({ editor }) => {
    const [isRewriting, setIsRewriting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    if (!editor) {
        return null;
    }

    const handleRewrite = async (instruction) => {
        const { from, to, empty } = editor.state.selection;
        if (empty) return;

        const text = editor.state.doc.textBetween(from, to, ' ');
        // Get surrounding context (e.g., 500 chars before)
        const contextStart = Math.max(0, from - 500);
        const context = editor.state.doc.textBetween(contextStart, from, ' ');

        setIsRewriting(true);

        try {
            // Show loading state by inserting a placeholder or just spinning
            // For now, let's keep selection and show spinner in menu

            const result = await rewriteText({
                text,
                instruction,
                context
            });

            if (result && result.rewritten) {
                editor.chain().focus().setTextSelection({ from, to }).insertContent(result.rewritten).run();
            }
        } catch (error) {
            console.error("Rewrite failed:", error);
            // Optionally show error toast
        } finally {
            setIsRewriting(false);
        }
    };

    return (
        <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100, placement: 'top' }}
            shouldShow={({ editor, view, state, from, to }) => {
                // Show only when text is selected and not empty
                return !state.selection.empty;
            }}
            className="rewrite-menu"
        >
            {isRewriting ? (
                <div className="rewrite-loading">
                    <span className="rewrite-spinner"></span> Rewriting...
                </div>
            ) : (
                <div className="rewrite-options">
                    <button onClick={() => handleRewrite("Improve clarity and flow")} className="rewrite-btn">
                        ✨ Rewrite
                    </button>
                    <button onClick={() => handleRewrite("Show, don't tell. Use sensory details.")} className="rewrite-btn">
                        👁️ Show
                    </button>
                    <button onClick={() => handleRewrite("Make it funnier and wittier")} className="rewrite-btn">
                        😂 Funny
                    </button>
                    <button onClick={() => handleRewrite("Expand with more descriptive detail")} className="rewrite-btn">
                        ➕ Expand
                    </button>
                    <button onClick={() => handleRewrite("Make it more dramatic and intense")} className="rewrite-btn">
                        🎭 Dramatic
                    </button>
                </div>
            )}
        </BubbleMenu>
    );
};

export default RewriteMenu;
