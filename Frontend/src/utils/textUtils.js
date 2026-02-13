export const stripHtml = (html) => {
    try {
        if (!html) return "";
        // If we're in a browser environment
        if (typeof document !== 'undefined') {
            const tmp = document.createElement("DIV");
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || "";
        }
        // Fallback for non-browser or if simple regex is preferred (though less accurate)
        return html.replace(/<[^>]*>?/gm, '');
    } catch (e) {
        console.error("Error stripping HTML:", e);
        return html || "";
    }
};
