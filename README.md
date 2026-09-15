# StudentSpark Copilot

### Academic guidance that helps students learn the method and take the next step.

[Visit the website](https://studentspark-copilot.vercel.app/) · [AI endpoint](api/ask.js) · [Database migrations](supabase/migrations)

StudentSpark brings academic explanations, targeted practice, and student planning into one web application. Its goal is to help a student understand an approach, practice it, and identify the skill to build next.

**Access:** The website is public to view. AI requests require authorized access and consume provider credits. Free trials are disabled. No access codes or API keys are provided in this README.

## Key workflows

| Workflow | What it does |
| --- | --- |
| Academic guidance | Explanations, approaches, examples, and practice according to the student's access plan. |
| Quiz Me | Prepares medium-difficulty practice using a subject, topic, and specific point. |
| Exam Me | Prepares harder exam-style practice, with instructions to explain the method and skill to improve. |
| My Week | Student-controlled planning features for supported access levels. |
| Source-aware guidance | Approved resource helpers and labeled further-reading suggestions. |
| Membership & usage | Server-side access checks, usage tracking, checkout integration, and support routes. |

Quiz and exam tools prepare requests for the existing chat. The student reviews and sends them; these are practice modes, not official examinations.

## Architecture

```text
Student interface -> Vercel API -> Access and request checks -> Anthropic API
                                        |-- Supabase: data and usage
                                        |-- Stripe: membership flows
```

The AI provider key is read on the server. Access rules, plan instructions, and usage controls are applied before an AI request is processed.

**JavaScript · HTML/CSS · Vercel Functions · Anthropic API · Supabase · Stripe**

## Repository guide

- [`index.html`](index.html): bundled application interface
- [`membership.js`](membership.js): membership UI and quiz/exam controls
- [`enhancements.js`](enhancements.js): additional interface behavior
- [`api/ask.js`](api/ask.js): active AI request endpoint
- [`lib/access.js`](lib/access.js): access helpers
- [`lib/request-security.js`](lib/request-security.js): request validation and rate-limit helpers
- [`lib/student-store.js`](lib/student-store.js): persistence and usage helpers
- [`supabase/migrations`](supabase/migrations): database schema changes

## Development

Install dependencies with `npm install`. Use a Vercel environment for the API routes; a static server alone cannot run the backend. Apply the Supabase migrations to your own database and configure the environment variables required by the API modules in your host's settings.

AI requests use `ANTHROPIC_API_KEY`; database helpers use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Membership routes require their own configured credentials and settings. Keep credentials in environment settings, not source files.

## Scope and limitations

- AI responses need review and do not guarantee academic accuracy, official policy, or grades.
- Feature availability depends on the access plan and deployed service configuration.
- Further-reading metadata is not proof that a source supports a generated claim.
- This is an independently built application, not an official university service.

## What this project demonstrates

End-to-end product development across a conversational interface, server-side AI integration, access controls, database-backed usage tracking, and payment-service integration—with an emphasis on student learning.
