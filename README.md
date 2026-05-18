# AiTherapist Web Platform

Web platform for the AiTherapist research prototype — a fine-tuned Qwen 2.5 7B model serving three roles (patient agent, therapist agent, diagnostic analyzer) for educational and research purposes.

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database + Auth**: Supabase
- **Inference**: Together AI (custom fine-tuned model)
- **Voice**: Web Speech API (browser-native)
- **Hosting**: Vercel + Supabase

## Modes

1. **Patient Agent** — Psychology students practice diagnosis by chatting with an AI patient
2. **Therapist Agent** — Real therapists validate model safety by role-playing as patients
3. **Simulation** — Server-side automated conversation between both agents

## Local Development

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials.

## Project Status

🚧 In active development. See branch `develop` for ongoing work.

## License

Private research prototype. Not for production clinical use.