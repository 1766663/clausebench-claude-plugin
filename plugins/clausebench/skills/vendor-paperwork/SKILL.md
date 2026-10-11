---
name: vendor-paperwork
description: Find a vendor's data processing agreement, sub-processor list, trust page, contracting legal entity, country and transfer mechanism. Use when someone asks where a vendor's DPA is, who they are actually contracting with, which entity signs, where a service is registered, or how a service covers transfers out of the EEA or the UK.
---

# Where a vendor's paperwork actually is

The pages that answer "where is Stripe's DPA" are mostly written by people selling templates, and the link
they give is often the marketing page rather than the agreement. This answers from a registry where a person
opened the page and recorded what was on it, with the date.

## How to answer

1. `resolve_vendors` with what the person wrote — a domain, a product name, a legal entity, anything.
2. If the answer is **confident**, call `vendor` with the slug and answer from the record.
3. If it is **candidates**, ask which one they mean. Two products of the same company often contract through
   the same entity and are still covered by different documents.
4. If it is **nothing**, say so plainly and stop. Do not search the web for a DPA link and present it as
   though it came from the registry: the value here is that somebody checked, and a link nobody checked has
   the opposite value.

## What to say

- **The contracting entity, not the brand.** "Stripe" is what the engineers call it; `Stripe Payments Europe,
  Limited` is who is on the other side of the contract, and that is the name a document needs.
- **The mechanism belongs to the document, not the company.** Two services of the same company can have
  different transfer mechanisms, because the mechanism is a property of the agreement that was read.
- **The UK is its own column.** A vendor covered towards the EEA by the DPF is covered towards the UK by the
  UK extension, the international data transfer addendum, or nothing at all. Answering a UK question out of
  the EU column is the most common way this gets written down wrongly.
- **An empty field is an answer.** "No sub-processor list link recorded" means nobody here found one, not that
  the vendor has none.
- **Give the date.** `verified_at` is when a person last confirmed the record; `updated_at` is when it last
  moved.

Never say that using a vendor makes anyone compliant, or that a DPA is sufficient. Those are decisions for
the person reading, and this is reference data.
