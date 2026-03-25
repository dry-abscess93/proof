# Contributing to Cronozen Proof

Thank you for your interest in contributing!

## Getting Started

```bash
git clone https://github.com/cronozen/proof.git
cd proof
npm install
npm run build
```

## Project Structure

```
├── packages/
│   ├── dpu-core/           # Core hash chain engine (zero dependencies)
│   ├── dp-schema-public/   # Shared types, enums, JSON-LD schemas
│   └── cronozen-sdk/       # High-level SDK for end users
├── mcp-server/             # MCP Server for AI client integration
└── examples/               # Quick start examples
```

## Development

- **Build all packages**: `npm run build`
- **Run MCP server in dev mode**: `npm run dev:mcp`
- **Type check**: `npm run typecheck`

## Guidelines

- Keep `dpu-core` zero-dependency — it must run anywhere
- Functions marked `@locked` in dpu-core must not change their signatures (breaking changes forbidden)
- All hash chain functions must maintain backward compatibility
- Write tests for new features

## Reporting Issues

Please open an issue on [GitHub](https://github.com/cronozen/proof/issues).

## License

By contributing, you agree that your contributions will be licensed under Apache-2.0.
