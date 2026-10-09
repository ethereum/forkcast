/**
 * A remark plugin that turns every newline inside a paragraph into a line break,
 * the way github.com renders issue bodies.
 *
 * CommonMark joins consecutive lines into one paragraph unless the author ends a
 * line with two spaces, but nobody writing a call agenda in the issue form knows
 * that — GitHub's own renderer breaks on the newline, so what the facilitator sees
 * when they file the issue is one line per item. Without this, an agenda whose
 * items are marked with en dashes rather than hyphens arrives as a single run-on
 * sentence (seen on every P2P Networking call).
 */

interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
}

/**
 * Split on the newlines a `text` node carries. Only `text` nodes are touched, so
 * code spans, fenced blocks and table structure are left exactly as parsed.
 */
const splitOnNewlines = (node: MdastNode): MdastNode[] =>
  node.value!.split('\n').flatMap((line, index) =>
    index === 0 ? [{ type: 'text', value: line }] : [{ type: 'break' }, { type: 'text', value: line }],
  );

const breakUpChildren = (node: MdastNode): void => {
  if (!node.children) return;

  node.children = node.children.flatMap(child => {
    if (child.type === 'text' && child.value?.includes('\n')) return splitOnNewlines(child);
    breakUpChildren(child);
    return child;
  });
};

export const remarkHardBreaks = () => (tree: MdastNode): MdastNode => {
  breakUpChildren(tree);
  return tree;
};
