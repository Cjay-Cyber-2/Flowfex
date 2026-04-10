import crypto from 'node:crypto';
import path from 'node:path';

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;
const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;

export function parseMarkdownSkillFile({ filePath, content }) {
  const { frontmatter, body } = extractFrontmatter(content);
  const relativeName = path.basename(filePath, path.extname(filePath));
  const title = extractTitle(frontmatter, body, relativeName);
  const { preamble, sections } = splitSections(body);
  const description = extractDescription(frontmatter, preamble, sections, title);
  const instructions = extractInstructions(frontmatter, sections, preamble);

  return {
    filePath,
    fileName: path.basename(filePath),
    fileStem: relativeName,
    rawContent: content,
    body,
    frontmatter,
    title,
    description,
    preamble,
    sections,
    instructions,
    lineCount: content.split('\n').length,
    contentHash: crypto.createHash('sha256').update(content).digest('hex')
  };
}

function extractFrontmatter(content) {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) {
    return {
      frontmatter: {},
      body: content
    };
  }

  return {
    frontmatter: parseFrontmatter(match[1]),
    body: content.slice(match[0].length)
  };
}

function parseFrontmatter(rawFrontmatter) {
  const lines = rawFrontmatter.split('\n');
  const parsed = {};
  let activeListKey = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const listMatch = trimmed.match(/^-\s+(.*)$/);
    if (listMatch && activeListKey) {
      parsed[activeListKey].push(parseScalar(listMatch[1]));
      continue;
    }

    const keyValueMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValueMatch) {
      activeListKey = null;
      continue;
    }

    const key = toCamelCase(keyValueMatch[1]);
    const value = keyValueMatch[2].trim();

    if (!value) {
      parsed[key] = [];
      activeListKey = key;
      continue;
    }

    parsed[key] = parseScalar(value);
    activeListKey = Array.isArray(parsed[key]) ? key : null;
  }

  return parsed;
}

function parseScalar(value) {
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map(entry => entry.trim())
      .filter(Boolean)
      .map(entry => stripQuotes(entry));
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }

  return stripQuotes(value);
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, '').trim();
}

function toCamelCase(value) {
  return value.replace(/[-_]+([a-zA-Z0-9])/g, (_, letter) => letter.toUpperCase());
}

function extractTitle(frontmatter, body, fallbackName) {
  if (typeof frontmatter.title === 'string' && frontmatter.title.trim()) {
    return cleanInline(frontmatter.title);
  }

  const headingMatch = body.match(/^#\s+(.*)$/m);
  if (headingMatch) {
    return cleanInline(headingMatch[1]);
  }

  return prettifyName(fallbackName);
}

function splitSections(body) {
  const lines = body.split('\n');
  const sections = [];
  const preambleLines = [];
  let currentSection = null;

  for (const line of lines) {
    const headingMatch = line.match(HEADING_PATTERN);

    if (headingMatch) {
      if (currentSection) {
        currentSection.content = currentSection.lines.join('\n').trim();
        sections.push(currentSection);
      }

      currentSection = {
        title: cleanInline(headingMatch[2]),
        level: headingMatch[1].length,
        lines: []
      };
      continue;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    } else {
      preambleLines.push(line);
    }
  }

  if (currentSection) {
    currentSection.content = currentSection.lines.join('\n').trim();
    sections.push(currentSection);
  }

  return {
    preamble: preambleLines.join('\n').trim(),
    sections
  };
}

function extractDescription(frontmatter, preamble, sections, title) {
  if (typeof frontmatter.description === 'string' && frontmatter.description.trim()) {
    return cleanParagraph(frontmatter.description);
  }

  const sources = [preamble, ...sections.map(section => section.content)];
  for (const source of sources) {
    const paragraph = firstParagraph(source);
    if (paragraph && cleanInline(paragraph) !== cleanInline(title)) {
      return cleanParagraph(paragraph);
    }
  }

  return `${title} imported from markdown skill content.`;
}

function extractInstructions(frontmatter, sections, preamble) {
  if (typeof frontmatter.instructions === 'string' && frontmatter.instructions.trim()) {
    return frontmatter.instructions.trim();
  }

  const relevantSections = sections.filter(section =>
    /instruction|workflow|process|steps|guidelines|rules|checklist|best practices|use when|when to use|approach|command/i.test(
      section.title
    )
  );

  if (relevantSections.length > 0) {
    return relevantSections
      .map(section => `${section.title}\n${section.content}`.trim())
      .join('\n\n')
      .trim();
  }

  return [preamble, ...sections.map(section => `${section.title}\n${section.content}`.trim())]
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function firstParagraph(content) {
  if (!content) {
    return '';
  }

  const paragraph = content
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .find(block => block && !block.startsWith('#'));

  return paragraph || '';
}

function cleanParagraph(value) {
  return cleanInline(value).replace(/\s+/g, ' ').trim();
}

function cleanInline(value) {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]+/g, '')
    .replace(/<\/?[^>]+>/g, '')
    .trim();
}

function prettifyName(value) {
  return value
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
    .trim();
}
