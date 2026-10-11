# clausebench for Claude Code

Who a vendor actually is — the contracting legal entity, its country, how it covers transfers out of the EEA and the
UK, and a checked link to its data processing agreement — answered from the
[clausebench vendor registry](https://clausebench.com/registry-api), where a person opened each page and recorded what
was on it. And a sub-processor list built from the services your repository actually uses.

## Install

```
/plugin marketplace add 1766663/clausebench-claude-plugin
/plugin install clausebench@clausebench
```

It works at once on a **public sandbox key**, which answers on ten well-known records (Stripe, Slack, Sentry and
others) and no others — enough to see what it does. For the whole registry, put your own key in the plugin's
settings; [clausebench.com/registry-api](https://clausebench.com/registry-api) says how to get one.

## What it gives you

| | |
|---|---|
| `/clausebench:subprocessors` | Reads your dependency and infrastructure files, matches what it finds against the registry, and writes the sub-processor table: contracting legal entity, country, transfer mechanism, DPA link. Anything it cannot match is left as a marked gap, never filled in from elsewhere. |
| `/clausebench:dpa <vendor>` | Where that vendor's DPA is, which legal entity signs it, and how transfers to the EEA and the UK are covered — with the date a person last confirmed it. |
| Skills | `subprocessor-list`, `vendor-paperwork`, and `privacy-policy-from-facts` — which drafts or reviews a privacy policy from what the code does and leaves every unconfirmed point as `[[GAP: …]]`. |
| MCP server `clausebench-registry` | Four tools: `resolve_vendors`, `vendor`, `subprocessor_summary`, `vendor_changes`. |
| Hook (optional) | When a dependency file gains a package, suggests looking the vendor up. |

## What leaves your machine

- **The MCP server** calls the clausebench API at `https://clausebench.com/api/v1`, sending only the vendor names,
  domains or registry slugs it is asked to look up, with your API key (or the public sandbox key). It sends no code,
  no file contents and nothing else from your project. That is the only network traffic the plugin makes.
- **The hook** (`hooks/hooks.json`, `scripts/new-dependency.mjs`) runs locally after a file is written or edited. It
  acts only when that file is a dependency manifest (`package.json`, `requirements.txt`, `pyproject.toml`,
  `Gemfile`, `go.mod`, `composer.json`, `docker-compose.yml`); for any other file it exits before reading anything.
  It makes **no network call**, reads no other file and no environment variable, and only adds a short note to the
  conversation naming the packages that were added.
  **To switch it off:** `/plugin` → clausebench → settings → *Notice new dependencies* → off.

How clausebench handles API requests: [privacy notice](https://clausebench.com/trust/privacy) ·
[security](https://clausebench.com/trust/security).

## What it will not do

It does not tell you that anything makes you compliant, it does not score vendors, and it never invents a legal
entity or a URL. "Not in the registry" is an answer it gives plainly. The data is reference material, as it stands,
without a warranty of completeness; the decisions your documents present remain yours.

## Requirements

Claude Code with plugin support, and Node.js 18 or later on your machine (the MCP server and the hook are single,
dependency-free `.mjs` files).

## Support

[hello@clausebench.com](mailto:hello@clausebench.com) · issues on this repository · security reports: see
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
