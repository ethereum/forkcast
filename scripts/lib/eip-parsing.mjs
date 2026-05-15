/**
 * Parse YAML frontmatter from EIP markdown content
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return null;
  }

  const frontmatter = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentValue = '';

  for (const line of lines) {
    // Check if line starts a new key
    const keyMatch = line.match(/^(\w[\w-]*):(.*)$/);
    if (keyMatch) {
      // Save previous key-value if exists
      if (currentKey) {
        frontmatter[currentKey] = currentValue.trim();
      }
      currentKey = keyMatch[1];
      currentValue = keyMatch[2];
    } else if (currentKey && line.startsWith('  ')) {
      // Continuation of previous value (multi-line)
      currentValue += ' ' + line.trim();
    }
  }

  // Save last key-value
  if (currentKey) {
    frontmatter[currentKey] = currentValue.trim();
  }

  return frontmatter;
}

/**
 * Map official frontmatter keys to local schema keys
 */
export function mapOfficialToLocal(official) {
  return {
    title: official.title,
    description: official.description,
    author: official.author,
    status: official.status,
    category: official.category,
    createdDate: official.created,
    type: official.type,
    discussionLink: official['discussions-to'] || undefined,
  };
}
