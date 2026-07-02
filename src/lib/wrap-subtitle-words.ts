export function wrapSubtitleWords(
  sanitizedHtml: string,
  isFavorited?: (word: string) => boolean,
): string {
  return sanitizedHtml.replace(
    /&[#a-z][^;]*;|<[^>]+>|[a-zA-Z][\w'\-]*[a-zA-Z]|[a-zA-Z]/gi,
    (match: string) => {
      if (match.startsWith("&") || match.startsWith("<")) {
        return match;
      }
      const cls = isFavorited?.(match)
        ? "sub-word sub-word--fav"
        : "sub-word";
      return `<span class="${cls}">${match}</span>`;
    },
  );
}
