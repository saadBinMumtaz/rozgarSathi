# 🚀 Rozgar Sathi — Your AI Interview Twin

> **Prepare smarter. Practice realistically. Get hired.**

**Rozgar Sathi** is an AI-powered career preparation platform built to help students and job seekers become genuinely interview-ready through **realistic AI interviews, intelligent evaluation, live coding practice, resume tailoring, and personalized feedback.**

Instead of simply giving candidates a list of interview questions, Rozgar Sathi simulates the experience of sitting in front of an interviewer.

---

## 🌍 The Problem

For millions of students and early-career job seekers, the biggest barrier isn't finding a job.

It's being **ready for the interview.**

Candidates often struggle with:

* ❌ No access to realistic mock interviews
* ❌ Fear and anxiety during interviews
* ❌ Generic interview preparation
* ❌ Weak answers to behavioral questions
* ❌ Difficulty explaining technical concepts
* ❌ Lack of real-time coding practice
* ❌ Resumes that don't match job descriptions
* ❌ No meaningful feedback after practice
* ❌ Limited access to professional career coaching

Traditional preparation tells candidates **what to study**.

Rozgar Sathi focuses on **how to perform.**

---

# 💡 Our Solution

Rozgar Sathi transforms interview preparation into an **AI-powered simulation experience.**

The platform acts as an intelligent **Interview Twin** that can:

> **Ask → Listen → Understand → Evaluate → Adapt → Improve**

Candidates can practice different interview formats, receive AI-generated feedback, improve their resumes, and repeatedly train until they become confident.

---

# 🧠 Core Features

## 🎤 1. AI Behavioral Interviews

Practice realistic HR and behavioral interviews with an AI interviewer.

The system can evaluate areas such as:

* Communication
* Confidence
* Relevance
* Structure
* Clarity
* Problem-solving
* Behavioral reasoning

Instead of simply marking an answer correct or incorrect, Rozgar Sathi analyzes **how effectively the candidate communicates their experience.**

---

## 💻 2. AI Technical Interviews

Simulate technical interviews across software engineering and computer science topics.

Candidates can practice:

* Programming concepts
* Data structures
* Algorithms
* Computer science fundamentals
* Technical reasoning
* Conceptual explanations

The AI interviewer can continue the conversation instead of treating every question as an isolated MCQ.

---

## ⚡ 3. Live Coding Interviews

Rozgar Sathi goes beyond theoretical technical interviews.

Candidates can solve coding problems in an interview-style environment.

The platform can:

* Present coding challenges
* Accept candidate solutions
* Execute code
* Evaluate results
* Analyze the solution
* Provide feedback
* Assess interview performance

This makes the experience closer to an actual technical interview.

---

## 🧠 4. AI-Powered Evaluation

Every interview is converted into actionable feedback.

Candidates can understand:

### What went well

* Strong communication
* Good technical understanding
* Relevant examples
* Logical reasoning

### What needs improvement

* Weak structure
* Missing details
* Unclear explanations
* Technical gaps
* Poor problem-solving approach

The goal isn't just a score.

The goal is **knowing what to improve next.**

---

## 📄 5. AI Resume Tailoring

A strong candidate can still get rejected because their resume doesn't match the job.

Rozgar Sathi helps solve this problem.

Candidates can provide their resume and a target job description.

The AI analyzes the relationship between them and generates a more job-focused version while preserving the candidate's actual experience and structure.

### Resume workflow

```text
Resume
   ↓
Job Description
   ↓
AI Analysis
   ↓
Skill & Keyword Matching
   ↓
Content Optimization
   ↓
Tailored Resume
```

---

## 🔊 6. Urdu AI Voice Experience

Career technology shouldn't feel inaccessible because of language.

Rozgar Sathi supports an **Urdu voice experience** using Azure Neural TTS, allowing interview questions to be delivered through natural Urdu speech.

This makes the platform more approachable for users who are more comfortable communicating in Urdu.

---

## 🔐 7. Google Authentication

Users can securely sign in using Google authentication.

The production architecture separates:

* Frontend authentication experience
* Backend OAuth handling
* User data persistence

---

## 🎯 8. Personalized Interview Experience

Rozgar Sathi is designed around the candidate rather than a fixed question list.

The system can use candidate context such as:

* Resume
* Job description
* Interview type
* Technical domain
* Previous answers

to make the interview experience more relevant.

---

# 🏗️ System Architecture

Rozgar Sathi follows a production-oriented architecture.

```text
                         ┌──────────────────────┐
                         │       USER           │
                         │  Web / Browser       │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │       VERCEL         │
                         │   React + Vite       │
                         │     Frontend         │
                         └──────────┬───────────┘
                                    │
                              REST API
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │       RAILWAY        │
                         │   Node + Express     │
                         │      Backend         │
                         └───────┬──────┬───────┘
                                 │      │
                    ┌────────────┘      └─────────────┐
                    ▼                                 ▼
          ┌─────────────────┐                ┌─────────────────┐
          │  MongoDB Atlas  │                │   AI Services   │
          │                 │                │                 │
          │ Users           │                │ Groq            │
          │ Interviews      │                │ OpenRouter      │
          │ Results         │                │ Azure TTS       │
          │ Resumes         │                │                 │
          └─────────────────┘                └─────────────────┘
```

---

# 🔄 Interview Intelligence Flow

```text
                 Candidate
                     │
                     ▼
             Select Interview
                     │
                     ▼
          AI Interviewer Engine
                     │
                     ▼
              Ask Question
                     │
                     ▼
           Candidate Responds
                     │
                     ▼
          Response Processing
                     │
                     ▼
             AI Evaluation
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
      Follow-up              Scoring
      Question               Engine
          │                     │
          └──────────┬──────────┘
                     ▼
              Final Report
                     │
                     ▼
          Personalized Feedback
```

---

# 🧩 Technology Stack

## Frontend

* React
* Vite
* JavaScript
* Tailwind CSS
* Modern component-based architecture
* Responsive UI

## Backend

* Node.js
* Express.js
* REST APIs
* JWT authentication
* Google OAuth
* Modular controller/service architecture

## Database

* MongoDB
* MongoDB Atlas

## Artificial Intelligence

* Groq API
* OpenAI-compatible LLM APIs
* OpenRouter for selected AI workflows

## Voice

* Azure Neural Text-to-Speech
* Urdu voice support

## Coding Evaluation

* External Judge0-compatible execution service
* Node.js VM fallback for controlled demo execution

## Deployment

* **Frontend:** Vercel
* **Backend:** Railway
* **Database:** MongoDB Atlas

---

# 🔥 What Makes Rozgar Sathi Different?

Most career platforms answer:

> **"What should I learn?"**

Rozgar Sathi asks:

> **"Can you actually perform when the interview starts?"**

### Traditional Preparation

```text
Watch Videos
     ↓
Read Questions
     ↓
Memorize Answers
     ↓
Hope for the Best
```

### Rozgar Sathi

```text
Practice
   ↓
Simulate
   ↓
Get Evaluated
   ↓
Understand Weaknesses
   ↓
Improve
   ↓
Practice Again
```

This creates a **continuous interview-improvement loop.**

---

# 🇵🇰 Built for the Next Generation of Pakistani Talent

Rozgar Sathi is designed with accessibility and local users in mind.

Pakistan has a huge population of students and young professionals entering an increasingly competitive job market.

Many talented candidates have:

* The technical ability
* The academic knowledge
* The ambition

but lack access to:

* Professional interview coaching
* Realistic mock interviews
* Personalized feedback
* Expensive career services

Rozgar Sathi aims to make high-quality interview preparation **accessible through AI.**

The inclusion of Urdu voice interaction is one step toward making career technology more inclusive.

---

# 📊 Product Impact

Rozgar Sathi focuses on measurable improvement.

Instead of simply completing an interview, users can identify:

| Area                   | Objective                                 |
| ---------------------- | ----------------------------------------- |
| 🗣️ Communication      | Speak clearly and confidently             |
| 🧠 Technical Knowledge | Strengthen conceptual understanding       |
| 💻 Coding              | Improve problem-solving ability           |
| 🎯 Interview Skills    | Perform better under pressure             |
| 📄 Resume              | Improve job relevance                     |
| 📈 Confidence          | Practice repeatedly in a safe environment |

---

# 🛡️ Production Architecture

The application has been designed with deployment and scalability in mind.

### Frontend

Hosted on Vercel for fast global delivery.

### Backend

Hosted as a persistent Node.js/Express service on Railway.

### Database

MongoDB Atlas provides cloud-based persistence.

### Environment Configuration

Secrets and API credentials are kept outside the source code through environment variables.

Sensitive credentials are **never exposed to the frontend.**

---

# 📁 Project Structure

```text
rozgarSathi/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── data/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.js
│   │
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── design-system/
│   │   ├── hooks/
│   │   ├── i18n/
│   │   ├── pages/
│   │   ├── api/
│   │   └── styles/
│   │
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .env.example
├── .gitignore
└── package.json
```

---

# 🚀 Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/saadBinMumtaz/rozgarSathi.git
cd rozgarSathi
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create the required environment files based on:

```text
.env.example
```

Configure:

* MongoDB
* Groq
* Google OAuth
* Azure TTS
* JWT
* Optional AI services
* Coding execution service

## 4. Start the backend

```bash
cd backend
npm start
```

## 5. Start the frontend

In another terminal:

```bash
cd frontend
npm run dev
```

The application will then be available through the Vite development server.

---

# 🌐 Live Demo

### 🚀 Frontend

**Rozgar Sathi**

https://rozgar-sathi-xi.vercel.app/

### ⚙️ Backend

**Production API**

https://cooperative-essence-production-c0a3.up.railway.app/

---

# 🔮 Future Roadmap

Rozgar Sathi can evolve from an interview simulator into a complete **AI career operating system.**

### Phase 1 — Interview Intelligence

* Advanced voice analysis
* Emotion/confidence signals
* Better adaptive follow-up questions
* Interview difficulty adjustment

### Phase 2 — Career Intelligence

* Job matching
* Skill-gap detection
* Personalized learning paths
* Career recommendations

### Phase 3 — Workforce Intelligence

* University partnerships
* Employer assessment portals
* AI candidate screening
* Institutional employability analytics

### Long-Term Vision

```text
             RESUME
                │
                ▼
         SKILL ANALYSIS
                │
                ▼
         INTERVIEW TRAINING
                │
                ▼
          PERFORMANCE DATA
                │
                ▼
          SKILL GAP ENGINE
                │
                ▼
          JOB MATCHING
                │
                ▼
             CAREER
```

The ultimate goal is simple:

> **Help talented people become employable, confident, and ready for opportunity.**

---

# 🏆 Hackathon Vision

Rozgar Sathi isn't just another chatbot.

It combines:

**AI + Interview Simulation + Voice + Coding Evaluation + Resume Intelligence + Career Preparation**

into one integrated experience.

The project demonstrates how AI can move beyond generating text and become an **interactive career coach capable of observing, evaluating, and helping users improve.**

---

# 👨‍💻 Built With

Built with passion for the next generation of developers and job seekers.

**Rozgar Sathi**

> *Your career deserves more than preparation.
> It deserves practice.*

---

## ⭐ If Rozgar Sathi helped you

Give the repository a ⭐ and share it with someone preparing for their next interview.
