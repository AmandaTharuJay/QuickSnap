# Quick Snap!

A two player version of the classic Snap card game... hit when the rank of the top cards match.

## AI QA Assistant website

This repository also includes a standalone static prototype for an AI QA Assistant dashboard.

Features:

- Sign-in gated dashboard experience
- Protocol selector for QCOM, SAS, ASP, X-Series, and all-protocol guidance
- Protocol question assistant with suggested prompts
- Protocol log analyzer for errors, warnings, identifiers, and next actions
- Defect documentation assistant that drafts reproducible bug reports

Run it locally:

```sh
python3 scripts/serve.py
```

Validate the static website files:

```sh
python3 scripts/validate_static.py
```