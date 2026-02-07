# MindSpero: AI-Powered EdTech Platform

Transform lecture notes into simplified PDFs and audio lessons with AI-powered processing.

## Features

- **User Authentication**: Email/password signup with automatic 30-day trial
- **File Upload**: Support for PDF, DOCX, and TXT files
- **AI Processing**: OpenAI GPT-4o-mini simplification with intelligent chunking
- **PDF Generation**: Create clean, readable PDFs from simplified notes
- **Audio Generation**: Multi-chunk TTS with MP3 stitching via ffmpeg
- **Payment Integration**: Paystack for GHS 30/month or GHS 300/year subscriptions
- **Professional UI**: Modern blue theme with responsive design

## Quick Start

### Prerequisites
- Node.js 18+
- npm/yarn
- ffmpeg installed on system

### Installation

1. Clone and install:
   ```bash
   npm install
   ```

2. Set up environment variables (copy and fill):
   ```bash
   cp .env.example .env.local
   ```
   
   Add your keys:
   - Supabase (project URL, anon key, service role key)
   - OpenAI API key
   - Paystack (secret key, public key, webhook secret)

3. Run dev server:
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000

## Database Schema

### Profiles Table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  trial_start_date TIMESTAMP,
  trial_end_date TIMESTAMP,
  bonus_trial_end_date TIMESTAMP,
  subscription_plan TEXT,
  subscription_end_date TIMESTAMP,
  created_at TIMESTAMP
);
```

### Notes Table
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY,
  user_id UUID,
  original_path TEXT,
  extracted_text TEXT,
  simplified_text TEXT,
  output_pdf_path TEXT,
  audio_path TEXT,
  status TEXT,
  created_at TIMESTAMP
);
```

## Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Important: ffmpeg Dependency
Install ffmpeg on your deployment platform (Vercel buildpack or buildpacks).

## API Endpoints

### Processing
- `POST /api/process` - Upload and process notes

### Payments
- `POST /api/paystack/initialize` - Start payment
- `POST /api/paystack/verify` - Verify transaction
- `POST /api/paystackWebhook` - Webhook for Paystack

### Auth
- `POST /api/createProfile` - Create new user profile

## Architecture

- **Frontend**: Next.js 13 with React 18
- **Backend**: Next.js API routes
- **Database**: Supabase PostgreSQL
- **File Storage**: Supabase Storage
- **AI**: OpenAI GPT-4o-mini
- **TTS**: google-tts-api
- **Audio Processing**: ffmpeg-static + fluent-ffmpeg
- **Payments**: Paystack
