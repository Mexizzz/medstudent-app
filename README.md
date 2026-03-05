# MedStudy — AI-Powered Medical Study App

A local-only web app for medical students. Upload PDFs and YouTube videos, generate AI-powered study activities, track your streak, and analyze your performance.

## Quick Start

### 1. Set up your API key
Edit `.env.local` and replace `your-api-key-here` with your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-...
```
Get a key at: https://console.anthropic.com

### 2. Run database migrations
```bash
npm run db:migrate
```

### 3. Start the app
```bash
npm run dev
```

Open http://localhost:3000

---

## Features

- **Content Library** — Upload PDFs, MCQ bank PDFs, or paste YouTube lecture URLs
- **AI Question Generation** — MCQs, Flashcards, Fill-in-the-blank, Short answer, Clinical cases
- **Study Sessions** — Practice any mix of question types from any sources
- **AI Grading** — Short answers are graded by Claude with detailed feedback
- **Streak Tracking** — Daily streak with 7-day calendar view
- **Study Plan** — Monthly calendar to plan daily study sessions
- **Analytics** — Radar chart by subject, performance over time, weak/strong topics

## How to Use

1. **Add content** → Library → "Add Content" → Upload a PDF or paste a YouTube URL
2. **Generate questions** → Click "Generate" on any source card → Choose activity types
3. **Study** → Study page → pick sources + activity types → Start Session
4. **Plan ahead** → Study Plan → click a day → Add plan items
5. **Track progress** → Analytics to see your weak areas and trends

## Supported YouTube Videos

Only videos with captions (auto-generated or manual subtitles) work.
Medical channels that work well: Ninja Nerd, Osmosis, Armando Hasudungan, Khan Academy Health, MedCram

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- SQLite (local database via Drizzle ORM)
- Claude claude-sonnet-4-6 (AI question generation and grading)
- Tailwind CSS + shadcn/ui + Recharts

## Data

The `medstudent.db` file stores all your content, questions, sessions, and progress locally. Back it up regularly.
