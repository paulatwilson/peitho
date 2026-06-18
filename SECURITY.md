# Security Policy

## Supported Code

This repository is pre-release. Security fixes apply to the current `main` branch until versioned releases exist.

## Reporting

Do not open public issues for sensitive security reports.

Send reports privately to the repository owner with:

- affected package or app
- reproduction steps
- expected impact
- relevant logs or proof of concept

## Secrets

Do not commit:

- `.env` files
- API keys
- model access tokens
- private model paths
- generated credentials
- local database files

The root `.gitignore` excludes `.env`, `.env.*`, logs, build output, coverage output, and dependencies.
