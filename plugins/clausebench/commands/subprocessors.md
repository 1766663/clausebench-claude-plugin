---
description: Build a sub-processor list for this repository from the services it actually uses
argumentHint: "[extra services, comma separated]"
---

Build the sub-processor list for this repository using the `subprocessor-list` skill.

Read the dependency and infrastructure files, resolve what you find against the vendor registry through the
`clausebench-registry` tools, and write the table. Leave every unmatched service as a marked gap rather than
filling it in from somewhere else.

$ARGUMENTS
