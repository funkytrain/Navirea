/**
 * Utilidad para parsear Markdown simple a HTML
 * Soporta headers, negrita, cursiva, código inline, links, y reglas horizontales
 */

// Referencia local a escapeHtml (definida en modal-system.js)
const _escapeHtml = (str) => window.escapeHtml ? window.escapeHtml(str) : String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);

/**
 * Convierte texto Markdown a HTML
 * @param {string} md - Texto en formato Markdown
 * @returns {string} HTML generado
 */
function parseMarkdown(md) {
    let html = md;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // Code inline
    html = html.replace(/`(.*?)`/gim, '<code>$1</code>');

    // Links (solo se permiten URLs http/https para prevenir javascript: y otros esquemas peligrosos)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (match, text, url) => {
        const trimmed = url.trim();
        if (!/^https?:\/\//i.test(trimmed)) return _escapeHtml(text);
        return `<a href="${trimmed}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });

    // Horizontal rule
    html = html.replace(/^\-\-\-$/gim, '<hr>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraphs
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><h([1-6])>/g, '<h$1>');
    html = html.replace(/<\/h([1-6])><\/p>/g, '</h$1>');
    html = html.replace(/<p><hr><\/p>/g, '<hr>');

    return html;
}

// Exportar a window para acceso global
window.parseMarkdown = parseMarkdown;
