export function wrapSubtitleWords(
  sanitizedHtml: string,
  isFavorited?: (word: string) => boolean,
): string {
  return sanitizedHtml.replace(
    /(^|>)([^<]+)(<|$)/g,
    (_full: string, before: string, text: string, after: string): string => {
      const wrapped = text.replace(
        /[a-zA-Z][\w'\-]*[a-zA-Z]|[a-zA-Z]/g,
        (word: string) => {
          const cls = isFavorited?.(word)
            ? "sub-word sub-word--fav"
            : "sub-word";
          return `<span class="${cls}">${word}</span>`;
        },
      );
      return before + wrapped + after;
    },
  );
}
