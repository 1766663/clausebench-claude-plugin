# Privacy

This plugin runs on your machine. The only data it sends anywhere is what its MCP server sends to the clausebench API
(`https://clausebench.com/api/v1`) when Claude calls one of its tools:

- the vendor names, domains or registry slugs being looked up, and
- your clausebench API key, or the public sandbox key `cbk_sandbox` if you have not set one.

It does not send source code, file contents, prompts, conversation text, environment variables, or anything that
identifies you beyond the API key. The optional hook makes no network call at all.

clausebench (REALTY.TM GROUP sp. z o.o.) processes API requests as described in its privacy notice:
https://clausebench.com/trust/privacy. Questions: privacy@clausebench.com.
