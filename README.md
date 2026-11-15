# AI Therapist

**A mental-health training simulator built on a single fine-tuned 7B language model.**

AI Therapist is an educational platform for psychology students and clinicians-in-training. One fine-tuned model is driven into three distinct clinical roles, so learners can practice real diagnostic and therapeutic skills against a consistent, always-available counterpart — no scheduling, no risk to a real person, no limit on repetitions.

![Dashboard — choose a mode to start a session](docs/images/dashboard.png)
<img width="1911" height="1001" alt="dashboard" src="https://github.com/user-attachments/assets/67eb9476-68f7-4cc6-92c2-9791e66366d8" />


---

## Three modes, one model

| Mode | Patient | Therapist | What it's for |
|---|---|---|---|
| **Patient Agent** | AI | You | **Practice diagnosis.** Interview an AI patient, then submit your diagnosis and get graded feedback. |
| **Therapist Agent** | You | AI | **Validate technique.** Role-play a case and evaluate how the AI therapist responds under pressure. |
| **Simulation** | AI | AI | **Observe a full session.** Two agents converse turn by turn while you study technique and how conditions present. |

The same model powers all three roles. The behavior switches through role-scoped prompting rather than separate models — which keeps the system compact and deployable.

<table>
<tr>
<td width="33%"><img src="docs/images/patient-agent.png" alt="Patient Agent setup"><br><sub><b>Patient Agent</b> — random or chosen condition</sub></td>
<td width="33%"><img src="docs/images/therapist-agent.png" alt="Therapist Agent setup"><br><sub><b>Therapist Agent</b> — you take the patient's chair</sub></td>
<td width="33%"><img src="docs/images/simulation.png" alt="Simulation setup"><br><sub><b>Simulation</b> — both agents, hands-free</sub></td>
</tr>
</table>
<img width="1893" height="986" alt="simulation png" src="https://github.com/user-attachments/assets/512bdf71-36bc-4517-8d3c-6b36d3b5f0f5" />
<img width="1892" height="995" alt="therapist-agent" src="https://github.com/user-attachments/assets/d17eb26f-945a-493b-aa88-5f7b8529a258" />
<img width="1884" height="991" alt="patient-agent" src="https://github.com/user-attachments/assets/a83a98c6-70b7-4c62-9687-e69198c2d4f3" />


---

## The evaluation layer

Every session ends in a structured **Clinical Analysis**, generated automatically from the transcript:

- **Detected condition**
- **Key symptoms observed**
- **Clinical reasoning** — the *why*, grounded in what the patient actually said
- **Differential considerations** — what else it could be, and why it isn't
- **Confidence indicator** — flags low-confidence reads instead of guessing blindly

![Clinical analysis card with reasoning and differentials](docs/images/clinical-analysis.png)
<img width="909" height="598" alt="clinical-analysis" src="https://github.com/user-attachments/assets/93239c6f-8508-4afe-bef8-46066723e3b1" />



In **Patient mode**, the learner submits a diagnosis and gets graded directly — correct, or wrong with a reasoned explanation drawn from the conversation itself. That turn, the explanation of *why* an answer was wrong, is what makes this a study tool rather than a chat log.

![Session results — diagnosis graded with feedback](docs/images/session-results.png)
<img width="1072" height="769" alt="session-results" src="https://github.com/user-attachments/assets/fe3739b0-bc80-4bfc-a520-6b08732cc121" />


Simulation mode produces a full, readable session transcript that can be reviewed and analyzed afterward.

![Full simulation transcript — patient and therapist turns](docs/images/transcript.png)
<img width="767" height="746" alt="transcript" src="https://github.com/user-attachments/assets/e897e542-6d63-4899-8dee-7008e57f5529" />


---

## Model and training

The model is a **Qwen 2.5 7B** base, adapted with **LoRA supervised fine-tuning** rather than trained from scratch — a 7B base keeps inference cost low enough to run a live, multi-turn educational product.

Training data was assembled from **open-source therapeutic and mental-health dialogue datasets**. Multiple corpora were combined and normalised into a single conversational format so the model learned to handle a broad range of presentations rather than overfitting to one source. Coverage spans depression, anxiety, stress, bipolar-related presentations, family conflict, and more.

The same base weights were then conditioned on several distinct roles:

- **Therapist** — reflective listening, open questioning, and goal-directed technique.
- **Patient** — consistent symptom presentation for a given condition, without breaking character.
- **Analyst** — emitting a structured clinical breakdown instead of free text.

Training the analyst role on structured output is what makes the evaluation layer reliable: the model produces parseable fields, so the UI can render reasoning, symptoms, and differentials consistently.

One dataset, one model, three behaviors — which is what keeps the whole system compact.

---

## Technical highlights

- **Fine-tuned 7B model** — Qwen 2.5 7B adapted with LoRA supervised fine-tuning on open-source therapeutic dialogue data.
- **Multi-role prompting** — one model, three behavioral profiles: supportive therapist, patient with a specific condition, and both at once in simulation.
- **Autonomous dual-agent loop** — two role-scoped instances of the model converse in a controlled loop, alternating turns until the session completes.
- **Structured output generation** — the model emits consistent, parseable clinical analysis instead of free text, so the UI can render it reliably.
- **Session persistence** — sessions and transcripts are stored and reviewable later.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Next.js, TypeScript, CSS |
| Model | Qwen 2.5 7B (LoRA + supervised fine-tuning) |
| Training data | Assembled from open-source therapeutic and mental-health dialogue datasets |

The specific dataset mix and LoRA hyperparameters are not published; the model weights are not distributed.

---

## Getting started

### Prerequisites

- Node.js 18+ and npm
- Access to a running inference endpoint serving the fine-tuned model

> The fine-tuned weights and training data are **not** included in this repository.

### Installation

```bash
git clone https://github.com/<your-username>/ai-therapist.git
cd ai-therapist
npm install
```

### Configuration

Create a `.env.local` file in the project root:

```bash
MODEL_ENDPOINT=http://localhost:8000/v1   # your inference server
MODEL_API_KEY=your_key_here
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and pick a mode from the dashboard.

### Build

```bash
npm run build
npm start
```

---

## Coverage

Conditions span depression, anxiety, stress, bipolar-related presentations, family conflict, and more. The patient agent can be assigned a specific condition for focused practice, or left random for realistic diagnosis drills.

---

## Scope

AI Therapist is an **educational and research project**. It is not a medical device, does not provide clinical diagnosis, and is not intended for real-world patient care. All generated analysis is presented as a learning aid.

---

## Status

Working prototype. The core flows — all three modes, diagnosis grading, clinical analysis, and session history — are functional. Next steps include broader condition coverage and further refinement of the analysis layer.

---
