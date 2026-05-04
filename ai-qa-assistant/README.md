# AI QA Assistant

CLI that scans this repository’s C# sources, applies project-aware static checks, and optionally asks OpenAI for a short QA narrative (risks, test ideas).

## Requirements

- Python 3.10+
- Optional: `OPENAI_API_KEY` for the AI section of the report

## Usage

From the `ai-qa-assistant` directory (no install):

```bash
cd ai-qa-assistant
python3 -m qa_assistant --root .. --no-ai
```

Install in a venv and use the `ai-qa` entry point:

```bash
cd ai-qa-assistant
python3 -m venv .venv && . .venv/bin/activate
pip install -e .
ai-qa --root .. --no-ai -o ../QA_REPORT.md
```

- **`--no-ai`**: only static findings (no network).
- **`-o FILE`**: write Markdown; otherwise prints to stdout.
- **`--json`**: also prints machine-readable findings on stdout.

Exit code **1** if any **high** severity static finding is present (useful in CI).

## Environment

| Variable | Meaning |
|----------|---------|
| `OPENAI_API_KEY` | Enables the AI review section |
| `OPENAI_MODEL` | Optional model override (default: `gpt-4o-mini`) |
