# V2 Meridian
A cozy local-first project management notebook

This repository now includes planning and behavior documentation for a new Meridian-style application built on Jazz 2.0.

If you want the fastest possible understanding of the future application, start here:

- [docs/features/00-feature-summary-and-breakdown.md](docs/features/00-feature-summary-and-breakdown.md)

That file is the high-level entry point for designers and developers. It explains:

- the overall product concept
- the main spaces in the application
- the feature groups and goals
- where to go next for deeper design and engineering detail

The current template intentionally keeps V1 narrow:

- organization spaces handle shared structure, people, settings, and project navigation
- project spaces handle the main execution and knowledge workflows
- personal workspace behavior stays lightweight
- backend-owned workflows are optional, not foundational

## Documentation Map

- [docs/features/00-feature-summary-and-breakdown.md](docs/features/00-feature-summary-and-breakdown.md)
- [docs/design/meridian-v2-design-brief.md](docs/design/meridian-v2-design-brief.md)
- [docs/design/meridian-v2-software-architecture.md](docs/design/meridian-v2-software-architecture.md)
- [docs/design/meridian-v2-template-plan.md](docs/design/meridian-v2-template-plan.md)
- [docs/features/README.md](docs/features/README.md)
- [docs/README.md](docs/README.md)

## Environment

- `VITE_APP_TITLE`: base browser tab title (default: `Meridian`)
- `VITE_DEV_TITLE_SUFFIX`: suffix shown in dev mode only (default: `DEV`)

Example in `.env.local`:

```bash
VITE_APP_TITLE="Meridian"
VITE_DEV_TITLE_SUFFIX="DEV"
```