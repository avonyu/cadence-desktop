export function wrapSubtitleWords(sanitizedHtml: string): string {
  return sanitizedHtml.replace(
    /(^|>)([^<]+)(<|$)/g,
    (_full: string, before: string, text: string, after: string): string => {
      const wrapped = text.replace(
        /[a-zA-Z][\w'\-]*[a-zA-Z]|[a-zA-Z]/g,
        (word: string) => `<span class="sub-word">${word}</span>`,
      );
      return before + wrapped + after;
    },
  );
}
