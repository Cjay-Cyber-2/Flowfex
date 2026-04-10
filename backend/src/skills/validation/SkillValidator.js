const BLOCKING_PATTERNS = [
  {
    type: 'prompt-injection',
    severity: 'high',
    pattern: /\b(ignore|disregard|override)\b.{0,40}\b(previous|prior|system|developer|safety|guardrails?)\b/i,
    message: 'Attempts to override higher-priority instructions.'
  },
  {
    type: 'hidden-behavior',
    severity: 'high',
    pattern: /\b(do not tell|never tell|hide this|secretly|without telling|conceal)\b/i,
    message: 'Requests hidden or deceptive behavior.'
  },
  {
    type: 'unsafe-instructions',
    severity: 'high',
    pattern: /\b(exfiltrat|steal|harvest|dump|collect)\b.{0,40}\b(password|credential|token|secret|api key|ssh key)\b/i,
    message: 'Appears to target credentials or secrets.'
  },
  {
    type: 'unsafe-instructions',
    severity: 'high',
    pattern: /\b(curl|wget)\b[^\n|]{0,120}\|\s*(sh|bash)\b/i,
    message: 'Contains shell piping patterns that are unsafe by default.'
  },
  {
    type: 'destructive-command',
    severity: 'high',
    pattern: /\brm\s+-rf\b|\bdel\s+\/[sq]\b|\bformat\s+c:\b/i,
    message: 'Contains destructive command patterns.'
  }
];

const WARNING_PATTERNS = [
  {
    type: 'tool-poisoning',
    severity: 'medium',
    pattern: /\b(always use|must use exclusively|never use other tools)\b/i,
    message: 'Attempts to force one tool path regardless of context.'
  },
  {
    type: 'quality',
    severity: 'medium',
    pattern: /\b(as an ai language model|chatgpt|claude)\b/i,
    message: 'Contains assistant persona noise that should not be in a reusable skill.'
  },
  {
    type: 'hidden-content',
    severity: 'medium',
    pattern: /<!--[\s\S]*?-->|[\u200B-\u200D\uFEFF]/,
    message: 'Contains hidden content that should be reviewed.'
  }
];

export function validateNormalizedSkill(skill, context = {}) {
  const findings = [];
  const scanTargets = [
    skill.prompt,
    skill.description,
    ...(skill.sections || []).map(section => section.content)
  ];
  const seenFindings = new Set();

  for (const target of scanTargets) {
    if (!target) {
      continue;
    }

    for (const rule of BLOCKING_PATTERNS) {
      const match = target.match(rule.pattern);
      if (match) {
        pushFinding(findings, seenFindings, {
          ...rule,
          evidence: match[0]
        });
      }
    }

    for (const rule of WARNING_PATTERNS) {
      const match = target.match(rule.pattern);
      if (match) {
        pushFinding(findings, seenFindings, {
          ...rule,
          evidence: match[0]
        });
      }
    }
  }

  const sanitizedPrompt = sanitizePrompt(skill.prompt);
  if (sanitizedPrompt !== skill.prompt) {
    pushFinding(findings, seenFindings, {
      type: 'sanitization',
      severity: 'medium',
      message: 'Prompt content was sanitized during import.',
      evidence: 'Removed one or more risky or irrelevant lines.'
    });
  }

  if (context.seenIds?.has(skill.id)) {
    pushFinding(findings, seenFindings, {
      type: 'duplicate-id',
      severity: 'high',
      message: `Duplicate skill id '${skill.id}' detected.`,
      evidence: context.seenIds.get(skill.id)?.filePath || skill.id
    });
  }

  if (context.seenHashes?.has(skill.contentHash)) {
    pushFinding(findings, seenFindings, {
      type: 'duplicate-content',
      severity: 'medium',
      message: 'Duplicate skill content detected.',
      evidence: context.seenHashes.get(skill.contentHash)?.filePath || skill.contentHash
    });
  }

  if (skill.description.length < 20) {
    pushFinding(findings, seenFindings, {
      type: 'quality',
      severity: 'medium',
      message: 'Description is too short to be reliable.',
      evidence: skill.description
    });
  }

  if (sanitizedPrompt.length < 160) {
    pushFinding(findings, seenFindings, {
      type: 'quality',
      severity: 'high',
      message: 'Sanitized prompt is too short to execute safely.',
      evidence: sanitizedPrompt
    });
  }

  if ((skill.sections || []).length === 0) {
    pushFinding(findings, seenFindings, {
      type: 'quality',
      severity: 'medium',
      message: 'Skill has no structured sections.',
      evidence: skill.id
    });
  }

  if (skill.lineCount > 600) {
    pushFinding(findings, seenFindings, {
      type: 'oversized-skill',
      severity: 'medium',
      message: 'Skill content is unusually large and may require review.',
      evidence: String(skill.lineCount)
    });
  }

  const hasBlockingFinding = findings.some(finding => finding.severity === 'high');
  const hasWarnings = findings.some(finding => finding.severity === 'medium');
  const validationStatus = hasBlockingFinding ? 'blocked' : hasWarnings ? 'review' : 'approved';
  const trustLevel = resolveTrustLevel(context.sourceTrustLevel, validationStatus);
  const qualityScore = calculateQualityScore(findings);

  return {
    allowed: validationStatus === 'approved',
    validationStatus,
    trustLevel,
    findings,
    sanitizedPrompt,
    qualityScore,
    summary: {
      totalFindings: findings.length,
      blockingFindings: findings.filter(finding => finding.severity === 'high').length,
      warnings: findings.filter(finding => finding.severity === 'medium').length
    }
  };
}

export function sanitizePrompt(prompt) {
  return prompt
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter(line => !isSanitizedNoise(line))
    .map(line => line.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isSanitizedNoise(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  if (/^#{1,6}\s+(table of contents|license|contributing|contributors)\b/i.test(trimmed)) {
    return true;
  }

  if (/^\[!\[.*\]\(.*\)\]\(.*\)$/.test(trimmed) || /^!\[.*\]\(.*\)$/.test(trimmed)) {
    return true;
  }

  if (/^[-*]\s+\[[^\]]+\]\(#.*\)$/.test(trimmed)) {
    return true;
  }

  if (/^\|.*\[[^\]]+\]\(#.*\).*\|$/.test(trimmed)) {
    return true;
  }

  return BLOCKING_PATTERNS.some(rule => rule.pattern.test(trimmed));
}

function resolveTrustLevel(sourceTrustLevel = 'unverified', validationStatus) {
  if (validationStatus === 'blocked') {
    return 'blocked';
  }

  if (validationStatus === 'review') {
    return sourceTrustLevel === 'trusted' ? 'reviewed-with-warnings' : 'unverified';
  }

  return sourceTrustLevel === 'trusted' ? 'trusted' : sourceTrustLevel;
}

function pushFinding(findings, seenFindings, finding) {
  const key = `${finding.type}:${finding.evidence}`;
  if (seenFindings.has(key)) {
    return;
  }

  seenFindings.add(key);
  findings.push(finding);
}

function calculateQualityScore(findings) {
  let score = 100;

  for (const finding of findings) {
    if (finding.severity === 'high') {
      score -= 30;
    } else if (finding.severity === 'medium') {
      score -= 10;
    }
  }

  return Math.max(0, score);
}
