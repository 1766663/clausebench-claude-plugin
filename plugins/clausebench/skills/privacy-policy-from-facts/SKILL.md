---
name: privacy-policy-from-facts
description: Draft or review a privacy policy, cookie notice or sub-processor page for this project from what the code actually does, marking every unconfirmed point as a gap instead of filling it. Use when asked to write, update or check a privacy policy, a cookie policy, a data protection notice, or the vendor section of one.
---

# A privacy policy written from facts, not from a template

Every generated privacy policy has the same defect: it reads as complete. It names a retention period nobody
chose, a legal basis nobody decided, and a list of recipients taken from the template rather than from the
system. A reader cannot tell which sentences were true.

This writes the opposite kind of draft. Everything that is not established from the repository or confirmed by
the person is left as a marked gap, and the document says so where the gap is.

## What can be established, and from where

Read, and say which of these you read:

- **Who the data goes to.** The dependency and infrastructure files, as in the `subprocessor-list` skill.
  Resolve them with `resolve_vendors` and name the contracting entity, not the brand.
- **What is collected.** The database schema, the forms, the analytics calls, the logging. A column is a
  fact; what it is *for* usually is not.
- **Where it is processed.** The hosting region in the infrastructure files, and each vendor's `data_regions`.
- **Cookies and similar.** The scripts the pages load and anything that writes to `document.cookie` or
  `localStorage`.

## What cannot, and must be marked

Never write these from a template. Write the marker and a one-line question for the person:

- the **legal basis** for each purpose;
- the **retention period** for each category;
- whether the operator is a **controller or a processor** for each activity;
- the **purpose** of a collected field, where the code does not say;
- the identity of the **operator**: legal name, address, registration number, contact for privacy questions;
- anything about **children**, **automated decision-making**, or **special categories**.

Write a gap as `[[GAP: retention period for support correspondence]]`, on its own, in the place where the
sentence would go. Do not soften it into "typically 12 months" — a plausible sentence is what makes an
unchecked document dangerous, and the marker is what makes it safe to hand to a lawyer.

## Rules for the text itself

- **Do not write that the product complies with anything.** A policy describes what is done; whether that
  satisfies a regime is a judgement, and not one to make in the document that would be the evidence.
- **Name the entity, not the product**, for every recipient.
- **Say when each vendor fact was checked**, once, at the foot of the vendor section.
- **Do not invent a URL.** If the DPA link is not in the registry, the row carries a gap.

## When reviewing an existing policy

Go the other way: take each factual claim in the document and try to establish it from the repository. Report
three lists — claims the code supports, claims the code contradicts, and claims the code cannot speak to. The
middle list is the one that matters, and it is the one a template-shaped review never produces.
