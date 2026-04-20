import crypto from 'node:crypto';
import path from 'node:path';

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;
const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;

export function parseMarkdownSkillFile({ filePath, content }) {
  const normalizedContent = normalizeLineEndings(content);
  const { frontmatter, body } = extractFrontmatter(normalizedContent);
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
    lineCount: normalizedContent.split('\n').length,
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

  // Skip HTML blocks (badges, banners, images) that appear before real content
  const cleanedPreamble = preamble
    .replace(/<p[^>]*>[\s\S]*?<\/p>/gi, '')
    .replace(/<div[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<a[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<img[^>]*\/?>/gi, '')
    .replace(/<hr\s*\/?>/gi, '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, '')
    .trim();

  const sources = [cleanedPreamble, preamble, ...sections.map(section => section.content)];
  for (const source of sources) {
    const paragraph = firstParagraph(source);
    const cleaned = cleanInline(paragraph);
    if (cleaned && cleaned !== cleanInline(title) && cleaned.length > 15) {
      return cleanParagraph(paragraph);
    }
  }

  // Fallback: use first non-empty section title + content snippet
  for (const section of sections) {
    const sectionDesc = cleanInline(section.content || '').slice(0, 200);
    if (sectionDesc.length > 15) {
      return cleanParagraph(`${section.title}: ${sectionDesc}`);
    }
  }

  return `${cleanInline(title) || 'Imported skill'} — imported from markdown skill content.`;
}

function extractInstructions(frontmatter, sections, preamble) {
  if (typeof frontmatter.instructions === 'string' && frontmatter.instructions.trim()) {
    return splitInstructionBlocks(frontmatter.instructions.trim());
  }

  const relevantSections = sections.filter(section =>
    /instruction|workflow|process|steps|guidelines|rules|checklist|best practices|use when|when to use|approach|command|features|how to get started|how to use|quick start|getting started|setup|usage|prerequisites|run|overview/i.test(
      section.title
    )
  );

  if (relevantSections.length > 0) {
    return relevantSections.flatMap(section => extractInstructionBlocksFromSection(section));
  }

  return [preamble, ...sections.map(section => `${section.title}\n${section.content}`.trim())]
    .filter(Boolean)
    .flatMap(block => splitInstructionBlocks(block));
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

function normalizeLineEndings(value) {
  return String(value).replace(/\r\n?/g, '\n');
}

function extractInstructionBlocksFromSection(section) {
  const content = section.content.trim();
  if (!content) {
    return [];
  }

  const listItems = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^([-*]|\d+\.)\s+/.test(line))
    .map(line => line.replace(/^([-*]|\d+\.)\s+/, '').trim())
    .filter(Boolean);

  if (listItems.length > 0) {
    return listItems;
  }

  return splitInstructionBlocks(`${section.title}\n${content}`);
}

function splitInstructionBlocks(value) {
  return String(value)
    .split(/\n\s*\n/)
    .flatMap(block =>
      block
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => line.replace(/^([-*]|\d+\.)\s+/, '').trim())
    )
    .filter(Boolean);
}
