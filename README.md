# Quick Snap!

A two player version of the classic Snap card game... hit when the rank of the top cards match.

## AI QA Assistant application

This repository also includes a standalone AI QA Assistant application. It serves a browser UI and a Python backend that owns sign-in sessions, selected protocol, activity history, protocol answers, log analysis, and defect drafting.

Features:

- Session-based sign-in gate
- Protocol selector for QCOM, SAS, ASP, X-Series, and all-protocol guidance
- Protocol question assistant backed by `/api/ask`
- Knowledge-base document ingestion backed by `/api/knowledge`
- Protocol log analyzer backed by `/api/analyze-log`
- Defect documentation assistant backed by `/api/draft-defect`
- Markdown session report export backed by `/api/export`
- Clear-history action backed by `/api/clear-history`
- Local JSON session persistence in `data/sessions.json`

Run it locally:

```sh
python3 scripts/serve.py
```

Validate the application files and QA engine behavior:

```sh
python3 scripts/validate_static.py
```

Run an end-to-end smoke test against a running app:

```sh
PORT=4173 python3 scripts/serve.py
python3 scripts/smoke_test.py
```

The smoke test signs in, switches protocol, asks a question, analyzes a log, drafts a defect, exports a report, clears history, and signs out.