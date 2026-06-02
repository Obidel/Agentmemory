import { MemoryCategory, MemorySource, Template } from '../types';

export const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  architecture: '#6366f1',  // indigo
  preference: '#8b5cf6',    // purple
  constraint: '#ef4444',    // red
  context: '#06b6d4',       // cyan
  decision: '#f59e0b',      // amber
};

export const CATEGORY_BG: Record<MemoryCategory, string> = {
  architecture: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  preference: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  constraint: 'bg-red-500/20 text-red-300 border-red-500/30',
  context: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  decision: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

export const SOURCE_ICONS: Record<MemorySource, string> = {
  claude: '🤖',
  cursor: '⚡',
  copilot: '🐙',
  manual: '✍️',
  import: '📥',
  template: '📋',
};

export const SOURCE_COLORS: Record<MemorySource, string> = {
  claude: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  cursor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  copilot: 'bg-green-500/20 text-green-300 border-green-500/30',
  manual: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  import: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  template: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
};

export const CATEGORIES: MemoryCategory[] = ['architecture', 'preference', 'constraint', 'context', 'decision'];
export const SOURCES: MemorySource[] = ['claude', 'cursor', 'copilot', 'manual', 'import', 'template'];

export const TEMPLATES: Template[] = [
  {
    id: 'tpl-react-ts',
    name: 'React + TypeScript Developer',
    description: 'Best practices for modern React development with TypeScript, hooks, and component architecture.',
    icon: '⚛️',
    category: 'Frontend',
    rules_count: 30,
    tags: ['react', 'typescript', 'frontend', 'hooks'],
    memories: [
      { content: 'Always use TypeScript strict mode with noImplicitAny and strictNullChecks enabled.', category: 'constraint', tags: ['typescript', 'strict'] },
      { content: 'Use functional components with hooks. Never create class components for new code.', category: 'preference', tags: ['react', 'hooks'] },
      { content: 'Component files should be named in PascalCase and match the component name exactly.', category: 'constraint', tags: ['naming', 'components'] },
      { content: 'Use React.memo() for components that render frequently with the same props.', category: 'preference', tags: ['performance', 'memoization'] },
      { content: 'Prefer named exports over default exports for better refactoring support.', category: 'preference', tags: ['exports', 'modules'] },
      { content: 'Use custom hooks to extract complex stateful logic from components.', category: 'architecture', tags: ['hooks', 'abstraction'] },
      { content: 'Always handle loading, error, and empty states in data-fetching components.', category: 'constraint', tags: ['ux', 'states'] },
      { content: 'Use Zod for runtime validation of external data and form inputs.', category: 'architecture', tags: ['validation', 'zod'] },
      { content: 'Avoid prop drilling more than 2 levels deep. Use Context or state management.', category: 'constraint', tags: ['props', 'context'] },
      { content: 'Use React.Suspense and lazy() for code splitting on route level.', category: 'architecture', tags: ['performance', 'code-splitting'] },
      { content: 'Write unit tests with React Testing Library. Focus on user behavior, not implementation.', category: 'preference', tags: ['testing', 'rtl'] },
      { content: 'Use React.useCallback for event handlers passed to child components.', category: 'preference', tags: ['performance', 'callbacks'] },
      { content: 'Use React.useMemo for expensive calculations that depend on props or state.', category: 'preference', tags: ['performance', 'memoization'] },
      { content: 'All form state should be managed with react-hook-form for consistency.', category: 'architecture', tags: ['forms', 'react-hook-form'] },
      { content: 'Use TanStack Query (React Query) for server state management.', category: 'architecture', tags: ['data-fetching', 'query'] },
    ],
  },
  {
    id: 'tpl-devops',
    name: 'DevOps Engineer',
    description: 'Infrastructure as code, CI/CD pipelines, container orchestration, and cloud-native practices.',
    icon: '🔧',
    category: 'Infrastructure',
    rules_count: 25,
    tags: ['devops', 'kubernetes', 'docker', 'cicd'],
    memories: [
      { content: 'All infrastructure must be defined as code using Terraform. No manual cloud console changes.', category: 'constraint', tags: ['terraform', 'iac'] },
      { content: 'Docker images must be multi-stage builds. Final image should be based on distroless or alpine.', category: 'constraint', tags: ['docker', 'security'] },
      { content: 'All secrets must be stored in HashiCorp Vault or cloud-native secret manager. Never in environment files.', category: 'constraint', tags: ['secrets', 'security'] },
      { content: 'Kubernetes deployments must define resource requests and limits for all containers.', category: 'constraint', tags: ['kubernetes', 'resources'] },
      { content: 'Use Helm charts for all Kubernetes application deployments.', category: 'preference', tags: ['helm', 'kubernetes'] },
      { content: 'CI/CD pipelines: build → test → security scan → staging deploy → smoke test → prod deploy.', category: 'architecture', tags: ['cicd', 'pipeline'] },
      { content: 'All services must expose /health and /metrics endpoints for monitoring.', category: 'constraint', tags: ['monitoring', 'health'] },
      { content: 'Use ArgoCD for GitOps-based continuous deployment to Kubernetes.', category: 'preference', tags: ['gitops', 'argocd'] },
      { content: 'Production deployments must be blue-green or canary. Never direct cutover.', category: 'constraint', tags: ['deployment', 'reliability'] },
      { content: 'All logs must be structured JSON format. Use correlation IDs for distributed tracing.', category: 'constraint', tags: ['logging', 'observability'] },
    ],
  },
  {
    id: 'tpl-python-backend',
    name: 'Python Backend Developer',
    description: 'FastAPI/Django patterns, async programming, database best practices, and API design.',
    icon: '🐍',
    category: 'Backend',
    rules_count: 28,
    tags: ['python', 'fastapi', 'backend', 'api'],
    memories: [
      { content: 'Use FastAPI for all new REST APIs. Include OpenAPI documentation for all endpoints.', category: 'preference', tags: ['fastapi', 'openapi'] },
      { content: 'Use Pydantic v2 for all data validation and serialization. Define strict models.', category: 'architecture', tags: ['pydantic', 'validation'] },
      { content: 'All database operations must use SQLAlchemy async sessions. Never use synchronous ORM calls in async context.', category: 'constraint', tags: ['sqlalchemy', 'async'] },
      { content: 'Use Alembic for all database migrations. Never modify production schema manually.', category: 'constraint', tags: ['alembic', 'migrations'] },
      { content: 'Background tasks should use Celery with Redis as broker. Never use threading.', category: 'architecture', tags: ['celery', 'tasks'] },
      { content: 'Use Poetry for dependency management. Pin all dependency versions in pyproject.toml.', category: 'preference', tags: ['poetry', 'dependencies'] },
      { content: 'All API endpoints must have rate limiting. Use slowapi for FastAPI rate limiting.', category: 'constraint', tags: ['rate-limiting', 'security'] },
      { content: 'Write tests with pytest and pytest-asyncio. Aim for >80% coverage on business logic.', category: 'constraint', tags: ['testing', 'pytest'] },
      { content: 'Use structlog for structured logging. Include request_id in all log entries.', category: 'preference', tags: ['logging', 'structlog'] },
      { content: 'Cache expensive queries with Redis. Use cache-aside pattern with TTL.', category: 'architecture', tags: ['caching', 'redis'] },
    ],
  },
  {
    id: 'tpl-data-scientist',
    name: 'Data Scientist',
    description: 'ML workflows, experiment tracking, model deployment, and data pipeline best practices.',
    icon: '📊',
    category: 'Data & ML',
    rules_count: 22,
    tags: ['python', 'ml', 'data', 'jupyter'],
    memories: [
      { content: 'All experiments must be tracked with MLflow. Log parameters, metrics, and artifacts.', category: 'constraint', tags: ['mlflow', 'experiment-tracking'] },
      { content: 'Use DVC for data versioning. Never commit large datasets to git.', category: 'constraint', tags: ['dvc', 'data-versioning'] },
      { content: 'Set random seeds for all stochastic processes: numpy, random, torch, tensorflow.', category: 'constraint', tags: ['reproducibility', 'seeds'] },
      { content: 'Use pandas for tabular data, polars for large datasets (>1M rows).', category: 'preference', tags: ['pandas', 'polars'] },
      { content: 'Always split data: train/validation/test. Never use test set for hyperparameter tuning.', category: 'constraint', tags: ['ml', 'data-split'] },
      { content: 'Model cards are required for all production models. Document performance, limitations, bias.', category: 'constraint', tags: ['model-cards', 'documentation'] },
      { content: 'Use hydra for experiment configuration management.', category: 'preference', tags: ['hydra', 'config'] },
      { content: 'Feature engineering pipelines must be sklearn Pipeline objects for consistency.', category: 'architecture', tags: ['sklearn', 'pipelines'] },
      { content: 'Deploy models with FastAPI + model wrapper. Use async endpoints for inference.', category: 'architecture', tags: ['deployment', 'fastapi'] },
      { content: 'Monitor model drift in production with Evidently AI or custom metrics.', category: 'constraint', tags: ['monitoring', 'drift'] },
    ],
  },
  {
    id: 'tpl-freelancer',
    name: 'Freelancer Best Practices',
    description: 'Client communication, project management, code quality, and delivery standards for freelancers.',
    icon: '💼',
    category: 'Business',
    rules_count: 15,
    tags: ['freelance', 'communication', 'projects'],
    memories: [
      { content: 'Always create a project scope document before starting work. Include deliverables, timeline, and payment milestones.', category: 'constraint', tags: ['scope', 'contracts'] },
      { content: 'Use GitHub for all client projects. Create a private repo per project and add client as collaborator.', category: 'preference', tags: ['github', 'collaboration'] },
      { content: 'Document all major decisions in a DECISIONS.md file in the project root.', category: 'constraint', tags: ['documentation', 'decisions'] },
      { content: 'Use Vercel or Netlify for frontend deployments. Provide preview URLs for client review.', category: 'preference', tags: ['deployment', 'preview'] },
      { content: 'Always write a README with setup instructions that a junior developer can follow.', category: 'constraint', tags: ['documentation', 'readme'] },
      { content: 'Keep clients updated weekly with a brief status email. Include completed, in-progress, blockers.', category: 'preference', tags: ['communication', 'updates'] },
      { content: 'Use semantic versioning for all releases. Tag releases in git.', category: 'constraint', tags: ['versioning', 'git'] },
      { content: 'Deliver projects with at least 70% test coverage. Include testing instructions.', category: 'constraint', tags: ['testing', 'quality'] },
    ],
  },
];

export const PLAN_LIMITS = {
  free: { memories: 50, projects: 1 },
  solo: { memories: Infinity, projects: 5 },
  team: { memories: Infinity, projects: Infinity },
};

export const PLAN_PRICES = {
  free: 0,
  solo: 10,
  team: 25,
};
