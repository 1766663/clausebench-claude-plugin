---
name: subprocessor-list
description: Build a sub-processor list for this repository — every third-party service the code actually uses, with its contracting legal entity, country, transfer mechanism and a checked link to its DPA. Use when someone asks for a sub-processor list, a vendor list, a list of data processors, a ROPA vendor section, or when a customer's security questionnaire asks who the sub-processors are.
---

# The sub-processor list, read out of the repository

A sub-processor list is normally assembled by hand from memory, and the two questions it has to answer —
**who is the legal entity on the other side of the contract**, and **where is their data processing agreement** —
are exactly the two nobody remembers. The repository already knows which services are in use. This reads that,
and looks the rest up.

## What to read

Look at whichever of these the repository has. Do not guess at the others.

- `package.json`, `requirements.txt`, `pyproject.toml`, `Gemfile`, `go.mod`, `composer.json`, `*.csproj` —
  hosted services usually appear as an SDK: `@sentry/*`, `stripe`, `resend`, `@aws-sdk/*`, `posthog-node`.
  A library that runs in-process and calls nobody is not a sub-processor: `lodash` is not a vendor.
- `.env.example`, `.env.sample`, `docker-compose.yml`, `*.tf`, `*.tfvars.example`, `k8s/*.yaml`,
  `fly.toml`, `render.yaml`, `vercel.json`, `app.yaml` — hostnames and `*_API_KEY` names are the strongest
  signal there is, because a key is only ever for something outside.
- The CI configuration and any `Dockerfile` base image registry.

Never open `.env`, `.env.local`, `*.tfvars` or any other file that holds real values — only the example and sample
files above, and only for the names of hosts and variables. A sub-processor list needs to know that a service is
used, never its key.

Collect a domain where you can see one, and the product name otherwise. A domain matches better.

## What to do with it

1. Call `resolve_vendors` from the `clausebench-registry` server with everything you collected, in one call.
2. For each input the answer calls **confident**, call `vendor` for the record and use its fields.
3. For each input that came back as **candidates**, put the shortlist in front of the person and let them
   choose. Do not pick for them: the whole point is that a wrong legal entity in this document is worse than a
   missing one.
4. For each input that matched **nothing**, write the row with the service's name and leave the rest blank,
   marked as a gap to fill. Do not look the entity up elsewhere and do not infer it from the domain.

## What to write

A table, one row per service:

| Service | Contracting entity | Country | Transfer mechanism | DPA | Sub-processor list |

Rules that matter more than the format:

- **An empty cell stays empty.** A plausible legal entity is the failure this is meant to prevent: it is the
  one field a reader will copy into a contract without checking.
- **Say where each fact came from.** Fields from the registry carry the date a person last confirmed the
  record (`verified_at`); say it once, under the table.
- **Do not write that anything is compliant.** This is a list of who processes data and where their paperwork
  is. Whether it is enough is a question for the person who signs it.
- **Say what you looked at.** List the files you read, so somebody can tell what the list would miss — a
  service configured only in a dashboard is invisible here and should be named as a possibility.

If the answers carry a `sandbox` note, say so: the public sandbox key answers on ten well-known records, so
"not in the registry" from it means "not in the sample".
