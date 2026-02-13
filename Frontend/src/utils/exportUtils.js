import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { stripHtml } from './textUtils';

export const exportToPdf = async ({ title, content, genre, chapters = [], author = 'Storynexis Writer' }) => {
  try {
    const doc = new jsPDF({
      format: 'a4',
      unit: 'mm'
    });

    // Setup Fonts
    doc.setFont("times", "roman"); // Use serif font for body

    // --- Title Page ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFont("times", "bold");
    doc.setFontSize(32);
    const titleLines = doc.splitTextToSize(title || "Untitled Story", 150);
    doc.text(titleLines, pageWidth / 2, 80, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(16);
    doc.text(`By ${author}`, pageWidth / 2, 100, { align: "center" });

    if (genre) {
      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text(genre, pageWidth / 2, 115, { align: "center" });
      doc.setTextColor(0); // Reset color
    }

    doc.setFontSize(10);
    doc.text("Generated with Storynexis", pageWidth / 2, pageHeight - 20, { align: "center" });

    // --- Content Pages ---

    // Helper to add page numbers
    const addPageFooter = (pageNumber) => {
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`${pageNumber}`, pageWidth / 2, pageHeight - 15, { align: "center" });
      doc.setTextColor(0);
    };

    let pageNum = 1;

    const addContentToDoc = (text, title = null) => {
      if (!text) return;

      doc.addPage();

      // Chapter Heading
      let yPos = 30;
      if (title) {
        doc.setFont("times", "bold");
        doc.setFontSize(24);
        doc.text(title, pageWidth / 2, yPos, { align: "center" });
        yPos += 20;
      }

      // Body Text
      doc.setFont("times", "roman");
      doc.setFontSize(12);
      doc.setLineHeightFactor(1.5);

      const cleanText = stripHtml(text).replace(/\n\n+/g, '\n\n'); // Normalize spacing
      const lines = doc.splitTextToSize(cleanText, 160); // 25mm margins approx

      // Layout text ensuring margins
      const margin = 25;
      const maxY = pageHeight - 25;

      for (let i = 0; i < lines.length; i++) {
        if (yPos > maxY) {
          addPageFooter(pageNum++);
          doc.addPage();
          yPos = 30;
        }
        doc.text(lines[i], margin, yPos, { align: "justify" });
        yPos += 7; // Line height approx
      }

      addPageFooter(pageNum++);
    };

    if (chapters && chapters.length > 0) {
      // Chapter based export
      chapters.forEach((chapter, index) => {
        const chapterTitle = chapter.title || `Chapter ${index + 1}`;
        // Extract content for this chapter
        // Note: 'content' usually contains whole story, so we rely on chapter structs if possible
        // If chapters have no content locally, we might need to rely on the full content string
        // But for now, assuming chapters may contain content or we just format the main content if chapters are metadata only
        // If Editor.jsx sends whole content in 'content' and 'chapters' are just markers:

        // Fallback: If chapters don't have content property, we might need a different strategy.
        // Assuming chapters have content or we are using the 'content' prop as single block fallback.

        // For this implementation, let's assume if chapters are present, we used them.
        // If chapter.content missing, we might be in trouble. 
        // Let's check Editor.jsx... it seems chapters list is metadata? 
        // Actually Editor.jsx:264: setContent(content + ... Chapter ...).
        // So 'content' is the WHOLE text.

        // Strategy: Regex split by "--- Chapter X: Title ---" or just export full content?
        // The user asked to "improve output".
        // If we have distinct chapter objects with clear demarcation, great. 
        // Editor.jsx implies chapters are just metadata and raw text is in `content`.
        // BUT, let's try to be smart. If we export solely based on `content`, we lose structure.

        // RE-READING Editor.jsx: 
        // handleAddChapter appends "--- Chapter X: Title ---".
        // So the `content` string contains markers.

        // Let's parse the `content` string for PDF to get clean breaks.

      });

      // Parse full content by chapter markers if present
      const chapterRegex = /--- Chapter \d+: (.*?) ---/g;
      const parts = content.split(chapterRegex);

      // parts[0] is intro/preamble
      if (parts[0] && parts[0].trim()) {
        addContentToDoc(parts[0], "Introduction");
      }

      // Subsequent parts are (Title, Content, Title, Content...)
      for (let i = 1; i < parts.length; i += 2) {
        const title = parts[i];
        const chapterText = parts[i + 1];
        addContentToDoc(chapterText, title);
      }

      // If no regex match but we have content (legacy or simple story)
      if (parts.length === 1) {
        addContentToDoc(content);
      }

    } else {
      // No chapters structure, single block
      addContentToDoc(content);
    }

    doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'story'}.pdf`);
    return true;
  } catch (error) {
    console.error("PDF Export Error:", error);
    throw error;
  }
};

export const exportToEpub = async ({ title, content, storyId, chapters = [], author = 'Storynexis Writer' }) => {
  try {
    const zip = new JSZip();

    // Clean filename
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'story';

    // 1. Mimetype
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    // 2. Container
    zip.folder("META-INF").file("container.xml", `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

    // 3. OEBPS
    const oebps = zip.folder("OEBPS");
    const titleStr = title || "Untitled Story";

    // Generate UUID
    const uniqueId = storyId || `urn:uuid:${Date.now()}`;

    // Prepare Chapters (Split content)
    const chapterData = [];
    const chapterRegex = /--- Chapter \d+: (.*?) ---/g;
    const parts = content.split(chapterRegex);

    let manifestItems = '';
    let spineItems = '';
    let navPoints = '';
    let fileCount = 0;

    const addChapterFile = (title, text) => {
      fileCount++;
      const filename = `chapter${fileCount}.xhtml`;
      const cleanText = stripHtml(text);
      // Wrap in paragraphs
      const paragraphs = cleanText.split('\n').filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join('\n');

      const xhtml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h2>${title}</h2>
  ${paragraphs}
</body>
</html>`;
      oebps.file(filename, xhtml);

      manifestItems += `<item id="ch${fileCount}" href="${filename}" media-type="application/xhtml+xml"/>\n`;
      spineItems += `<itemref idref="ch${fileCount}"/>\n`;
      navPoints += `<navPoint id="navPoint-${fileCount}" playOrder="${fileCount}">
                <navLabel><text>${title}</text></navLabel>
                <content src="${filename}"/>
            </navPoint>\n`;
    };

    // Process Content
    if (parts.length > 1) {
      if (parts[0] && parts[0].trim()) addChapterFile("Introduction", parts[0]);
      for (let i = 1; i < parts.length; i += 2) {
        addChapterFile(parts[i], parts[i + 1]);
      }
    } else {
      addChapterFile(titleStr, content);
    }

    // Styles
    oebps.file("styles.css", `
            body { font-family: 'Times New Roman', serif; margin: 5%; line-height: 1.5; text-align: justify; }
            h1, h2, h3 { text-align: center; margin-bottom: 1em; page-break-after: avoid; }
            p { margin-bottom: 1em; text-indent: 1.5em; }
            p:first-of-type { text-indent: 0; }
        `);

    // Content.opf
    const opfContent = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${titleStr}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="BookID">${uniqueId}</dc:identifier>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0] + 'Z'}</meta>
  </metadata>
  <manifest>
    ${manifestItems}
    <item id="css" href="styles.css" media-type="text/css"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`;

    oebps.file("content.opf", opfContent);

    // TOC.ncx
    const ncxContent = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uniqueId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${titleStr}</text></docTitle>
  <navMap>
    ${navPoints}
  </navMap>
</ncx>`;

    oebps.file("toc.ncx", ncxContent);

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${safeTitle}.epub`);
    return true;
  } catch (error) {
    console.error("ePub Export Error:", error);
    throw error;
  }
};
