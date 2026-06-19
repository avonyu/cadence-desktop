export function sanitizeSubtitleHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;(\/?)i&gt;/g, '<$1i>')
    .replace(/&lt;(\/?)b&gt;/g, '<$1b>')
    .replace(/&lt;(\/?)u&gt;/g, '<$1u>')
}
