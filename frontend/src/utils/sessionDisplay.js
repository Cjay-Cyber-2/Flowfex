const STRIPPED_TASK_SNIPPETS = [
  'fix the code editor in the task workspace and make sure that it is working perfectly and well',
  'fix the code editor in the task workspace',
  'make sure that it is working perfectly and well',
];

const PLACEHOLDER_SESSION_NAME = 'Syniq Session';

export function sanitizeWorkspaceTaskText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  let text = value.trim();
  for (const snippet of STRIPPED_TASK_SNIPPETS) {
    text = text.replace(new RegExp(snippet, 'gi'), '').trim();
  }

  text = text.replace(/\s{2,}/g, ' ').replace(/^[-–—:,.\s]+|[-–—:,.\s]+$/g, '').trim();
  return text;
}

export function sanitizeWorkspaceSessionFields(session) {
  if (!session || typeof session !== 'object') {
    return session;
  }

  const task = sanitizeWorkspaceTaskText(session.task);
  const name = sanitizeWorkspaceTaskText(session.name);

  const safeName = name && name.length > 0 ? name : PLACEHOLDER_SESSION_NAME;

  return {
    ...session,
    task: task || 'Live orchestration',
    name: safeName,
  };
}
