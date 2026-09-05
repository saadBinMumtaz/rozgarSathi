// backend/src/services/interviewProfile.js
// JD-derived Interview Profile + Relevance Gate.
//
// The JD is the PRIMARY source of truth for interview topic selection.
// The resume only personalizes — it NEVER defines interview topics.
//
// Priority hierarchy:
//   1. Job Description (role, responsibilities, required skills)
//   2. Job Required Skills (technicalFocus from JD analysis)
//   3. Job Preferred Skills (secondary skills from JD)
//   4. Target Role / Seniority
//   5. Candidate Resume — ONLY for personalization

import logger from '../utils/logger.js';

// ─── Domain Taxonomy ───────────────────────────────────────────────────────

const ROLE_DOMAINS = {
  'data engineer': {
    primary: [
      'python', 'sql', 'etl', 'elt', 'data pipelines', 'data engineering',
      'data warehousing', 'data modeling', 'pandas', 'spark', 'pyspark',
    ],
    related: [
      'airflow', 'dbt', 'aws', 'gcp', 'azure', 'docker', 'kubernetes',
      'kafka', 'bigquery', 'redshift', 'snowflake', 'databricks',
      'system design', 'ci/cd', 'git', 'monitoring', 'logging',
      'background jobs', 'deployment', 'redis', 'rest apis',
      'authentication', 'caching', 'security', 'fastapi',
    ],
    irrelevant: [
      'react', 'css', 'html', 'tailwindcss', 'vite', 'accessibility',
      'browser behavior', 'state management', 'nestjs',
    ],
  },
  'data analyst': {
    primary: [
      'sql', 'python', 'pandas', 'data visualization', 'tableau', 'power bi',
      'excel', 'data analysis', 'statistics',
    ],
    related: [
      'r', 'jupyter', 'etl', 'data modeling', 'data warehousing',
      'machine learning', 'matplotlib', 'seaborn',
    ],
    irrelevant: [
      'react', 'css', 'html', 'tailwindcss', 'vite', 'accessibility',
      'browser behavior', 'state management', 'nestjs', 'kubernetes',
      'terraform',
    ],
  },
  'frontend engineer': {
    primary: [
      'react', 'javascript', 'typescript', 'css', 'html', 'redux',
      'state management', 'next.js', 'tailwindcss', 'vite',
    ],
    related: [
      'testing', 'accessibility', 'browser behavior', 'webpack',
      'storybook', 'sass', 'bootstrap', 'graphql', 'rest apis',
      'git', 'ci/cd', 'deployment', 'debugging', 'express',
      'node.js', 'nestjs',
    ],
    irrelevant: [
      'mongodb', 'kubernetes', 'terraform', 'airflow', 'pandas',
      'data engineering', 'pytorch', 'tensorflow', 'mlops', 'llm',
      'background jobs', 'incident response',
    ],
  },
  'backend engineer': {
    primary: [
      'node.js', 'express', 'python', 'fastapi', 'django', 'flask',
      'rest apis', 'sql', 'mongodb', 'postgresql', 'authentication',
      'caching', 'security', 'api integration', 'nestjs',
    ],
    related: [
      'redis', 'docker', 'aws', 'system design', 'ci/cd', 'testing',
      'git', 'deployment', 'background jobs', 'monitoring', 'logging',
      'kafka', 'rabbitmq', 'graphql', 'debugging', 'typescript',
      'javascript',
    ],
    irrelevant: [
      'react', 'css', 'html', 'tailwindcss', 'vite', 'accessibility',
      'browser behavior', 'state management', 'pytorch', 'tensorflow',
      'mlops', 'airflow', 'pandas', 'data engineering',
    ],
  },
  'full stack engineer': {
    primary: [
      'react', 'node.js', 'express', 'javascript', 'typescript',
      'rest apis', 'sql', 'mongodb', 'api integration',
    ],
    related: [
      'css', 'html', 'testing', 'docker', 'aws', 'git', 'ci/cd',
      'deployment', 'system design', 'redis', 'authentication',
      'caching', 'security', 'debugging', 'nestjs',
    ],
    irrelevant: [
      'pytorch', 'tensorflow', 'mlops', 'airflow', 'pandas',
      'data engineering', 'llm', 'kubernetes', 'terraform',
    ],
  },
  'devops engineer': {
    primary: [
      'docker', 'kubernetes', 'aws', 'ci/cd', 'terraform', 'linux',
      'monitoring', 'deployment', 'incident response',
    ],
    related: [
      'ansible', 'helm', 'prometheus', 'grafana', 'git', 'nginx',
      'system design', 'security', 'logging', 'redis', 'python',
      'background jobs',
    ],
    irrelevant: [
      'react', 'css', 'html', 'tailwindcss', 'vite', 'accessibility',
      'browser behavior', 'state management', 'pytorch', 'tensorflow',
      'mlops', 'pandas', 'data engineering', 'nestjs',
    ],
  },
  'machine learning engineer': {
    primary: [
      'python', 'machine learning', 'pytorch', 'tensorflow', 'mlops',
      'llm', 'pandas', 'scikit-learn',
    ],
    related: [
      'docker', 'kubernetes', 'aws', 'sql', 'ci/cd', 'git',
      'system design', 'monitoring', 'deployment', 'redis',
      'data engineering', 'fastapi', 'rest apis',
    ],
    irrelevant: [
      'react', 'css', 'html', 'tailwindcss', 'vite', 'accessibility',
      'browser behavior', 'state management', 'nestjs',
    ],
  },
  'software engineer': {
    primary: [
      'python', 'javascript', 'typescript', 'java', 'sql',
      'system design', 'rest apis',
    ],
    related: [
      'react', 'node.js', 'express', 'docker', 'aws', 'git', 'ci/cd',
      'testing', 'mongodb', 'redis', 'deployment', 'debugging',
      'authentication', 'caching', 'security',
    ],
    irrelevant: [],
  },
};

// ─── Skill Synonyms ────────────────────────────────────────────────────────

const SKILL_SYNONYMS = {
  'js': 'javascript', 'ts': 'typescript',
  'nodejs': 'node.js', 'node': 'node.js',
  'mongo': 'mongodb', 'postgres': 'postgresql',
  'postgresql': 'sql', 'mysql': 'sql', 'sqlite': 'sql',
  'react.js': 'react', 'reactjs': 'react',
  'express.js': 'express', 'expressjs': 'express',
  'nest.js': 'nestjs', 'nextjs': 'next.js',
  'vue.js': 'vue', 'vuejs': 'vue',
  'apache airflow': 'airflow', 'apache spark': 'spark',
  'pyspark': 'spark', 'k8s': 'kubernetes',
  'tf': 'terraform', 'ml': 'machine learning',
  'ai': 'machine learning', 'dl': 'machine learning',
  'deep learning': 'machine learning', 'nlp': 'machine learning',
  'large language model': 'llm', 'gpt': 'llm',
  'ci': 'ci/cd', 'cd': 'ci/cd', 'cicd': 'ci/cd',
  'tailwind': 'tailwindcss',
  'scikit': 'scikit-learn', 'sklearn': 'scikit-learn',
};

// ─── Concept keywords per domain ───────────────────────────────────────────

const DOMAIN_CONCEPTS = {
  'data engineer': [
    'pipeline', 'etl', 'elt', 'warehouse', 'data lake', 'batch',
    'streaming', 'data quality', 'schema', 'partition', 'ingestion',
    'transformation', 'orchestrat', 'dag', 'data catalog',
  ],
  'frontend engineer': [
    'component', 'render', 'dom', 'hook', 'state', 'props', 'bundle',
    'responsive', 'layout', 'animation', 'accessibility', 'aria',
    'viewport', 'browser',
  ],
  'backend engineer': [
    'api', 'endpoint', 'middleware', 'auth', 'database', 'query',
    'migration', 'cache', 'queue', 'worker', 'rate limit', 'webhook',
    'server', 'route', 'controller',
  ],
  'devops engineer': [
    'container', 'orchestrat', 'deploy', 'pipeline', 'infra',
    'provision', 'monitor', 'alert', 'scaling', 'load balanc',
    'rollback', 'health check',
  ],
  'machine learning engineer': [
    'model', 'train', 'inference', 'feature', 'hyperparameter',
    'accuracy', 'precision', 'recall', 'loss', 'gradient',
    'embedding', 'fine-tun',
  ],
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const normalize = (str) => {
  if (!str) return '';
  const lower = str.toLowerCase().trim();
  return SKILL_SYNONYMS[lower] || lower;
};

const skillsMatch = (a, b) => {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};

const resolveDomain = (role) => {
  if (!role) return null;
  const lower = role.toLowerCase().trim();

  // Direct match in ROLE_DOMAINS
  if (ROLE_DOMAINS[lower]) return ROLE_DOMAINS[lower];

  // Keyword-based domain detection
  const domainKeywords = {
    'data engineer': ['data engineer', 'data platform', 'etl developer'],
    'data analyst': ['data analyst', 'bi analyst', 'business intelligence'],
    'frontend engineer': ['frontend', 'front-end', 'ui engineer', 'client-side'],
    'backend engineer': ['backend', 'back-end', 'server-side', 'api engineer'],
    'full stack engineer': ['full stack', 'fullstack', 'full-stack'],
    'devops engineer': ['devops', 'dev ops', 'sre', 'site reliability', 'platform engineer', 'infrastructure'],
    'machine learning engineer': ['machine learning', 'ml engineer', 'ai engineer', 'deep learning'],
    'software engineer': ['software engineer', 'software developer', 'application developer'],
  };

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return ROLE_DOMAINS[domain] || null;
    }
  }

  return null;
};

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Build a structured Interview Profile from a JDAnalysis document.
 */
export const buildInterviewProfile = (jdAnalysis) => {
  if (!jdAnalysis) {
    return {
      role: '', domain: null,
      primarySkills: [], relatedSkills: [], allRelevantSkills: [],
      irrelevantSkills: [], experienceLevel: '', keywords: [], concepts: [],
    };
  }

  const role = jdAnalysis.role || '';
  const domain = resolveDomain(role);

  const jdTechnicalFocus = (jdAnalysis.technicalFocus || []).map(normalize);
  const jdSkills = (jdAnalysis.skills || []).map(normalize);

  const domainPrimary = domain ? domain.primary.map(normalize) : [];
  const domainRelated = domain ? domain.related.map(normalize) : [];
  const domainIrrelevant = domain ? domain.irrelevant.map(normalize) : [];

  // Primary = JD technicalFocus + domain primary overlapping with JD
  const primarySkills = [...new Set([
    ...jdTechnicalFocus,
    ...jdSkills.filter(s => domainPrimary.some(dp => skillsMatch(s, dp))),
    ...domainPrimary.filter(dp => jdSkills.some(js => skillsMatch(js, dp))),
  ])];

  if (primarySkills.length === 0) {
    primarySkills.push(...jdSkills);
  }

  const relatedSkills = [...new Set([
    ...domainRelated.filter(rs => !primarySkills.some(ps => skillsMatch(rs, ps))),
    ...(jdAnalysis.keywords || []).map(normalize).filter(k =>
      !primarySkills.some(ps => skillsMatch(k, ps)) && k.length > 2
    ),
  ])];

  const allRelevantSkills = [...primarySkills, ...relatedSkills];

  const irrelevantSkills = domainIrrelevant.filter(
    irr => !jdSkills.some(js => skillsMatch(irr, js)) &&
           !jdTechnicalFocus.some(tf => skillsMatch(irr, tf))
  );

  const concepts = domain
    ? Object.entries(DOMAIN_CONCEPTS)
        .filter(([key]) => resolveDomain(key) === domain)
        .flatMap(([, terms]) => terms)
    : [];

  logger.debug(
    `InterviewProfile: role="${role}" domain=${domain ? 'yes' : 'generic'} ` +
    `primary=[${primarySkills.join(',')}] related_count=${relatedSkills.length} ` +
    `irrelevant_count=${irrelevantSkills.length}`
  );

  return {
    role, domain, primarySkills, relatedSkills, allRelevantSkills,
    irrelevantSkills, experienceLevel: jdAnalysis.experienceLevel || '',
    keywords: (jdAnalysis.keywords || []).map(normalize), concepts,
  };
};

/**
 * Relevance Gate: validate a question against the interview profile.
 * Deterministic — no LLM calls. Understands concepts, not just keywords.
 */
export const isQuestionRelevant = (question, profile) => {
  if (!profile || !profile.role) {
    return { relevant: true, reason: 'no_jd_context' };
  }

  const questionSkill = normalize(question.skill || question.topic || '');
  const questionText = (question.text || question.title || '').toLowerCase();

  // Check 1: Primary skill match
  if (questionSkill && profile.primarySkills.some(ps => skillsMatch(questionSkill, ps))) {
    return { relevant: true, reason: 'primary_skill_match' };
  }

  // Check 2: Related skill match
  if (questionSkill && profile.relatedSkills.some(rs => skillsMatch(questionSkill, rs))) {
    return { relevant: true, reason: 'related_skill_match' };
  }

  // Check 3: Explicitly irrelevant
  if (questionSkill && profile.irrelevantSkills.some(irr => skillsMatch(questionSkill, irr))) {
    return { relevant: false, reason: `irrelevant_skill:${questionSkill}` };
  }

  // Check 4: Conceptual match via domain concepts
  if (profile.concepts.length > 0) {
    const matchedConcepts = profile.concepts.filter(c => questionText.includes(c));
    if (matchedConcepts.length >= 1) {
      return { relevant: true, reason: 'conceptual_match' };
    }
  }

  // Check 5: Question text mentions primary skill terms
  const textMentionsPrimary = profile.primarySkills.some(ps => {
    const term = ps.toLowerCase();
    return term.length > 2 && questionText.includes(term);
  });
  if (textMentionsPrimary) {
    return { relevant: true, reason: 'text_mentions_primary_skill' };
  }

  // Check 6: Generic engineering skills acceptable across roles
  const genericSkills = [
    'system design', 'debugging', 'testing', 'ci/cd', 'git',
    'deployment', 'monitoring', 'logging', 'security',
  ];
  if (questionSkill && genericSkills.some(gs => skillsMatch(questionSkill, gs))) {
    return { relevant: true, reason: 'generic_engineering_skill' };
  }

  // Check 7: No skill tag — check for irrelevant text mentions
  if (!questionSkill) {
    const irrelevantInText = profile.irrelevantSkills.filter(
      irr => irr.length > 3 && questionText.includes(irr)
    );
    if (irrelevantInText.length > 0) {
      return { relevant: false, reason: `text_irrelevant:${irrelevantInText.join(',')}` };
    }
    return { relevant: true, reason: 'no_skill_tag_generic' };
  }

  // Check 8: Unknown skill for a specific role — reject
  if (profile.domain && profile.irrelevantSkills.length > 0) {
    return { relevant: false, reason: `unknown_skill_for_role:${questionSkill}` };
  }

  // Broad role — allow unknown skills
  return { relevant: true, reason: 'broad_role_unknown_allowed' };
};

/**
 * Filter questions through the relevance gate.
 */
export const filterRelevantQuestions = (questions, profile) => {
  if (!profile || !profile.role) return questions;

  return questions.filter(q => {
    const gate = isQuestionRelevant(q, profile);
    if (!gate.relevant) {
      logger.debug(
        `Rejected by gate: "${(q.text || q.title || '').substring(0, 60)}" ` +
        `reason=${gate.reason} skill=${q.skill || q.topic || 'none'}`
      );
    }
    return gate.relevant;
  });
};

/**
 * Score a question's relevance (0-1) for ranking.
 */
export const relevanceScore = (question, profile) => {
  if (!profile || !profile.role) return 0.5;

  const questionSkill = normalize(question.skill || question.topic || '');
  let score = 0.3;

  if (questionSkill && profile.primarySkills.some(ps => skillsMatch(questionSkill, ps))) {
    score += 0.5;
  } else if (questionSkill && profile.relatedSkills.some(rs => skillsMatch(questionSkill, rs))) {
    score += 0.25;
  }

  const text = (question.text || question.title || '').toLowerCase();
  const keywordHits = profile.keywords.filter(k => k.length > 2 && text.includes(k));
  score += Math.min(0.2, keywordHits.length * 0.05);

  return Math.min(1.0, score);
};

export default {
  buildInterviewProfile,
  isQuestionRelevant,
  filterRelevantQuestions,
  relevanceScore,
};
