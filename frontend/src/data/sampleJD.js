// frontend/src/data/sampleJD.js
// Single fixture source for "Try a sample JD" pickers (Master Context Sec. 15.1,
// Rules.md Sec. 22). Sample JD content lives ONLY here — never inline in components.
// Coverage: junior/associate/mid/senior seniority across multiple tech domains.

export const sampleJDs = [
  {
    id: 'junior-frontend-react',
    seniority: 'Junior / Associate',
    label: 'Frontend (React) — Junior',
    text: `Junior Frontend Developer
Location: Karachi, Pakistan (On-site)

We are looking for a Junior Frontend Developer to join our growing product team. This is a great opportunity for an early-career engineer to learn from senior mentors while shipping real features.

Responsibilities:
- Build and maintain responsive web pages using HTML, CSS, and JavaScript.
- Implement UI components in React under the guidance of senior developers.
- Fix bugs, write simple unit tests, and participate in code reviews.
- Collaborate with designers to turn Figma mockups into working pages.

Requirements:
- 0-2 years of experience with HTML, CSS, JavaScript, and React basics.
- Understanding of Git version control fundamentals.
- Eagerness to learn, strong communication skills, and attention to detail.
- BS in Computer Science or equivalent practical experience.`,
  },
  {
    id: 'associate-fullstack-web',
    seniority: 'Junior / Associate',
    label: 'Full-Stack (Web) — Associate',
    text: `Associate Software Engineer (Full-Stack)
Location: Islamabad, Pakistan (Hybrid)

We are hiring an Associate Software Engineer to work across our web stack. You will contribute to both frontend and backend features, guided by a senior mentor.

Responsibilities:
- Develop UI screens in React and the supporting APIs in Node.js and Express.
- Write SQL queries against our PostgreSQL database and fix data-related bugs.
- Write unit tests and document the features you build.
- Participate in daily standups, sprint planning, and code reviews.

Requirements:
- 1-2 years of experience with JavaScript, HTML, and CSS.
- Familiarity with React, Node.js, and Git version control.
- Basic understanding of REST APIs and relational databases.
- Strong willingness to learn, ownership mindset, and good teamwork skills.`,
  },
  {
    id: 'mid-react-frontend',
    seniority: 'Mid-Level',
    label: 'React Frontend — Mid-Level',
    text: `Mid-Level React Frontend Developer
Location: Remote (Pakistan)

A product company is hiring a Mid-Level React Frontend Developer to own customer-facing features end to end, from design handoff to production.

Responsibilities:
- Build reusable, accessible UI components with React 18 and TypeScript.
- Manage application state with Redux Toolkit or Zustand.
- Style features with TailwindCSS and maintain responsive layouts.
- Write component tests and improve Core Web Vitals performance.
- Collaborate closely with designers and backend engineers on API contracts.

Requirements:
- 3+ years of frontend experience, with at least 2 years in React.
- Solid TypeScript skills and experience with state management libraries.
- Understanding of REST API integration and browser performance basics.
- Good communication skills and the ability to mentor junior teammates.`,
  },
  {
    id: 'mid-python-data',
    seniority: 'Mid-Level',
    label: 'Python Data Engineer — Mid-Level',
    text: `Mid-Level Data Engineer (Python)
Location: Lahore, Pakistan (Hybrid)

A fast-growing fintech company is hiring a Mid-Level Data Engineer to build and maintain the data pipelines that power our analytics and risk products.

Responsibilities:
- Design and maintain ETL pipelines using Python, Pandas, and SQL.
- Model data in PostgreSQL and optimize slow-running queries.
- Schedule and monitor batch jobs with Airflow.
- Work with product managers to define metrics and data contracts.
- Ensure data quality with automated tests and validation checks.

Requirements:
- 2-4 years of professional experience in data engineering or analytics.
- Strong Python skills and solid SQL query writing.
- Experience with ETL workflows, data modeling, and version control using Git.
- Good problem-solving skills and the ability to explain technical decisions clearly.
- Experience with cloud platforms such as AWS or GCP is a plus.`,
  },
  {
    id: 'mid-node-backend',
    seniority: 'Mid-Level',
    label: 'Node.js Backend — Mid-Level',
    text: `Mid-Level Node.js Backend Developer
Location: Karachi, Pakistan (On-site)

An e-commerce platform is hiring a Mid-Level Node.js Backend Developer to build and scale the services behind our checkout, inventory, and payments systems.

Responsibilities:
- Design and build REST APIs with Node.js, Express, and NestJS.
- Model data and write efficient queries in MongoDB and PostgreSQL.
- Implement authentication, authorization, and rate limiting.
- Add caching with Redis and background jobs with message queues.
- Write integration tests and support CI/CD deployments with Docker.

Requirements:
- 2-4 years of backend development experience with Node.js.
- Strong understanding of REST API design, authentication, and security basics.
- Hands-on experience with MongoDB or PostgreSQL, and Git workflows.
- Clear communication skills and a careful, testing-first mindset.`,
  },
  {
    id: 'senior-mern-fullstack',
    seniority: 'Senior',
    label: 'Full-Stack (MERN) — Senior',
    text: `Senior React & Node.js Developer
Location: Remote (Pakistan)

Responsibilities:
- Build high-performance frontend interfaces in React, Vite, and TailwindCSS.
- Develop scalable REST APIs and microservices using Node.js and Express.
- Work with MongoDB database schemas, aggregation pipelines, and performance optimization.
- Write clean, testable code and participate in technical design discussions.

Requirements:
- 4+ years of professional experience in Full-Stack Web Development.
- Strong proficiency in JavaScript (ES6+), TypeScript, React, and Node.js.
- Experience with state management, RESTful services, and asynchronous programming.
- Excellent problem-solving skills, teamwork, and communication skills.`,
  },
  {
    id: 'senior-ai-ml',
    seniority: 'Senior',
    label: 'AI/ML Engineer — Senior',
    text: `Senior AI/ML Engineer
Location: Lahore, Pakistan (Hybrid)

An AI product studio is hiring a Senior AI/ML Engineer to design and ship intelligent features built on large language models and classical machine learning.

Responsibilities:
- Build and evaluate ML models with Python, PyTorch, or TensorFlow.
- Design LLM-powered features: prompt pipelines, RAG retrieval, and evaluation suites.
- Serve models through FastAPI endpoints and monitor them in production.
- Manage experiments, datasets, and model versioning with MLOps tooling.
- Mentor junior engineers and review model design proposals.

Requirements:
- 4+ years of experience in machine learning or data science roles.
- Strong Python skills and deep understanding of model evaluation.
- Experience with LLM APIs, embeddings, and vector search is highly valued.
- Solid software engineering habits: Git, testing, and clean API design.
- Ability to explain complex model behavior to non-technical stakeholders.`,
  },
  {
    id: 'senior-devops-cloud',
    seniority: 'Senior',
    label: 'DevOps & Cloud — Senior',
    text: `Senior DevOps & Cloud Engineer
Location: Remote (Pakistan)

A SaaS company serving international clients is hiring a Senior DevOps & Cloud Engineer to own the reliability and deployment pipeline of our platform.

Responsibilities:
- Manage AWS infrastructure including EC2, S3, RDS, and Lambda.
- Containerize services with Docker and orchestrate them on Kubernetes.
- Build and maintain CI/CD pipelines with GitHub Actions.
- Define infrastructure as code using Terraform.
- Set up monitoring, alerting, and incident response runbooks.

Requirements:
- 5+ years of experience in DevOps, SRE, or platform engineering roles.
- Deep hands-on experience with AWS, Docker, and Kubernetes.
- Strong scripting skills in Bash or Python and solid Git workflows.
- Excellent troubleshooting skills and calm incident management.
- Clear written communication for cross-timezone teamwork.`,
  },
];

// Group order for the sample-JD picker UI.
export const sampleSeniorityOrder = ['Junior / Associate', 'Mid-Level', 'Senior'];

export default sampleJDs;
