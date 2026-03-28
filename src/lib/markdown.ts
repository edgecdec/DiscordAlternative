export type MdPart =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "strikethrough"; value: string }
  | { type: "inlineCode"; value: string }
  | { type: "codeBlock"; value: string; lang: string };

const CODE_BLOCK_RE = /```(\w*)\n?([\s\S]*?)```/;
const INLINE_CODE_RE = /`([^`\n]+)`/;
const BOLD_RE = /\*\*(.+?)\*\*/;
const STRIKE_RE = /~~(.+?)~~/;
const ITALIC_RE = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/;

type Rule = { re: RegExp; toMd: (m: RegExpExecArray) => MdPart };

const RULES: Rule[] = [
  { re: CODE_BLOCK_RE, toMd: (m) => ({ type: "codeBlock", value: m[2], lang: m[1] }) },
  { re: INLINE_CODE_RE, toMd: (m) => ({ type: "inlineCode", value: m[1] }) },
  { re: BOLD_RE, toMd: (m) => ({ type: "bold", value: m[1] }) },
  { re: STRIKE_RE, toMd: (m) => ({ type: "strikethrough", value: m[1] }) },
  { re: ITALIC_RE, toMd: (m) => ({ type: "italic", value: m[1] }) },
];

/** Find the earliest matching rule in a string */
function findFirst(text: string): { rule: Rule; match: RegExpExecArray } | null {
  let best: { rule: Rule; match: RegExpExecArray } | null = null;
  for (const rule of RULES) {
    const m = rule.re.exec(text);
    if (m && (!best || m.index < best.match.index)) {
      best = { rule, match: m };
    }
  }
  return best;
}

/** Parse plain text into markdown parts. No nesting — keeps it simple. */
export function parseMarkdown(text: string): MdPart[] {
  const parts: MdPart[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const found = findFirst(remaining);
    if (!found) {
      parts.push({ type: "text", value: remaining });
      break;
    }
    const { rule, match } = found;
    if (match.index > 0) {
      parts.push({ type: "text", value: remaining.slice(0, match.index) });
    }
    parts.push(rule.toMd(match));
    remaining = remaining.slice(match.index + match[0].length);
  }

  return parts;
}
