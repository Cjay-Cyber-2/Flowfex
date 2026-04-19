import {
  buildCatalogSkillReference,
  buildCatalogSkillRegistry,
  matchCatalogEntryToLocalSkills
} from './CatalogSkillEnhancer.js';

export function isCatalogMarkdown(filePath, content) {
  const catalogEntryCount = (content.match(/^- \*\*\[[^\]]+\]\([^)]+\)\*\* - /gm) || []).length;

  return (
    /curates links only/i.test(content) ||
    /awesome agent skills/i.test(content) ||
    /skills count/i.test(content) ||
    catalogEntryCount >= 20
  );
}

export function parseCatalogMarkdown({ filePath, content, localSkillIndex }) {
  const lines = content.split('\n');
  const entries = [];
  const sectionCounts = {};
  let currentSection = 'Uncategorized';
  let currentSubsection = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{2,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const heading = cleanInline(headingMatch[2]);

      if (isProviderSection(heading) || level <= 3) {
        currentSection = heading;
        currentSubsection = null;
      } else {
        currentSubsection = heading;
      }

      continue;
    }

    const summaryMatch = line.match(/<summary><h3[^>]*>(.*?)<\/h3><\/summary>/i);
    if (summaryMatch) {
      currentSection = cleanInline(summaryMatch[1]);
      currentSubsection = null;
      continue;
    }

    const entryMatch = line.match(/^- \*\*\[([^\]]+)\]\(([^)]+)\)\*\* - (.*)$/);
    if (!entryMatch) {
      continue;
    }

    const [, name, url, description] = entryMatch;
    const baseEntry = {
      name: cleanInline(name),
      title: cleanInline(name),
      url: url.trim(),
      description: cleanInline(description),
      section: currentSection,
      subsection: currentSubsection,
      sourceType: inferCatalogSourceType(url)
    };
    const localMatches = matchCatalogEntryToLocalSkills(baseEntry, localSkillIndex);
    const entry = buildCatalogSkillReference(baseEntry, { localMatches });

    entries.push(entry);
    sectionCounts[currentSection] = (sectionCounts[currentSection] || 0) + 1;
  }

  return {
    filePath,
    entryCount: entries.length,
    entries,
    sections: Object.entries(sectionCounts).map(([title, count]) => ({ title, count })),
    registry: buildCatalogSkillRegistry(entries)
  };
}

function inferCatalogSourceType(url) {
  if (/officialskills\.sh/i.test(url)) {
    return 'officialskills';
  }

  if (/github\.com/i.test(url)) {
    return 'github';
  }

  return 'external';
}

function isProviderSection(heading) {
  return /^(official claude skills|community skills|skill[s]? by|security skills by|marketing skills by|product manager skills by|product management skills by)/i.test(
    heading
  );
}

function cleanInline(value) {
  return value
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]+/g, '')
    .trim();
}
