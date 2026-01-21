# Town View

Real-time visualization and management interface for Gas Town.

## Overview

Town View provides visibility into your Gas Town multi-agent workspace:

- **Monitor** - Real-time view of rigs, agents, and work in progress
- **Audit** - Review polecat work history and assignments
- **Roadmap** - Epic/task hierarchy visualization
- **Edit** - Update bead status, priority, and details with confirmation

## Quick Start

### Prerequisites

- Go 1.22+
- Node.js 18+
- npm
- `bd` CLI (beads) installed and in PATH
- Gas Town running (with `~/gt` as town root)

### Installation

```bash
# Install dependencies
make install
```

### Development

Run in two terminals:

```bash
# Terminal 1: Start backend (port 8080)
make server

# Terminal 2: Start frontend (port 3000)
make frontend
```

Open http://localhost:3000

### Storybook

Develop and preview components:

```bash
make storybook
```

Open http://localhost:6006

## Architecture

```
townview/
├── server/              # Go backend
│   ├── cmd/townview/    # Entry point
│   └── internal/
│       ├── beads/       # bd CLI integration
│       ├── handlers/    # HTTP handlers
│       ├── rigs/        # Rig discovery
│       ├── types/       # Shared types
│       ├── watcher/     # File system watcher
│       └── ws/          # WebSocket hub
│
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom hooks
│   │   ├── stores/      # Zustand stores
│   │   ├── types/       # TypeScript types
│   │   └── styles/      # CSS/Tailwind
│   └── .storybook/      # Storybook config
│
├── keeper/              # Seed vault
│   └── seeds/           # Pattern definitions
│
├── CONSTITUTION.md      # Project principles
└── DESIGN_SYSTEM.md     # Visual design guide
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rigs` | List discovered rigs |
| GET | `/api/rigs/:id` | Get rig details |
| GET | `/api/rigs/:id/issues` | List issues for rig |
| GET | `/api/rigs/:id/issues/:id` | Get single issue |
| PATCH | `/api/rigs/:id/issues/:id` | Update issue |
| GET | `/api/rigs/:id/agents` | List agents for rig |
| WS | `/ws` | Real-time updates |

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `TOWN_ROOT` | `~/gt` | Gas Town root directory |
| `PORT` | `8080` | HTTP server port |
| `BD_PATH` | `bd` | Path to bd CLI |
| `LOG_LEVEL` | `info` | Logging level |

## Tech Stack

- **Backend**: Go, gorilla/websocket, fsnotify
- **Frontend**: React 18, Vite, TailwindCSS, Zustand
- **Components**: shadcn/ui patterns
- **Testing**: Vitest, Storybook

## Design

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for the visual design guide.

Hybrid aesthetic: Clean dashboard foundation with Mad Max industrial accents.

## License

Part of Gas Town.
