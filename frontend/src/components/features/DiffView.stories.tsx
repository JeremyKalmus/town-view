import type { Meta, StoryObj } from '@storybook/react'
import { DiffView } from './DiffView'
import type { ContentVersion } from '@/types'

const mockVersions: ContentVersion[] = [
  {
    id: 'v1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    actor: 'mayor',
    content: `# Authentication System

Users need to be able to log in securely.

## Requirements
- Username and password login
- Session management`,
  },
  {
    id: 'v2',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    actor: 'crew/gastown/jeremy',
    content: `# Authentication System

Users need to be able to log in securely.

## Requirements
- Username and password login
- Session management
- Password reset functionality

## Technical Notes
Use bcrypt for password hashing.`,
  },
  {
    id: 'v3',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    actor: 'polecat/gastown/dag',
    content: `# Authentication System

Users need to be able to log in securely with OAuth support.

## Requirements
- Username and password login
- OAuth providers (Google, GitHub)
- Session management with JWT
- Password reset functionality

## Technical Notes
Use bcrypt for password hashing.
JWT tokens expire after 24 hours.`,
  },
  {
    id: 'v4',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    actor: 'witness/gastown/furiosa',
    content: `# Authentication System

Users need to be able to log in securely with OAuth support.

## Requirements
- Username and password login
- OAuth providers (Google, GitHub)
- Session management with JWT
- Password reset functionality
- Two-factor authentication (2FA)

## Technical Notes
Use \`bcrypt\` for password hashing.
JWT tokens expire after **24 hours**.
Store refresh tokens in Redis.

## Acceptance Criteria
1. User can sign up with email
2. User can log in with OAuth
3. Sessions persist across browser restarts`,
  },
]

const meta: Meta<typeof DiffView> = {
  title: 'Features/DiffView',
  component: DiffView,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="w-full h-[500px] bg-bg-primary p-4 rounded-lg border border-border">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof DiffView>

export const Default: Story = {
  args: {
    versions: mockVersions,
    className: 'h-full',
  },
}

export const SingleVersion: Story = {
  args: {
    versions: [mockVersions[0]],
    className: 'h-full',
  },
}

export const TwoVersions: Story = {
  args: {
    versions: mockVersions.slice(0, 2),
    className: 'h-full',
  },
}

export const Empty: Story = {
  args: {
    versions: [],
    className: 'h-full',
  },
}

export const LargeChanges: Story = {
  args: {
    versions: [
      {
        id: 'v1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        actor: 'mayor',
        content: `# Bug Report

## Summary
Application crashes on startup.

## Steps to Reproduce
1. Open the app
2. Wait 5 seconds
3. App crashes`,
      },
      {
        id: 'v2',
        timestamp: new Date().toISOString(),
        actor: 'polecat/gastown/dag',
        content: `# Bug Report: Application Crash on Startup

## Summary
Application crashes on startup when user has more than 1000 items in their cache.

## Environment
- OS: macOS 14.0
- App Version: 2.3.1
- Memory: 8GB

## Steps to Reproduce
1. Create a user with large cache (>1000 items)
2. Open the application
3. Wait for initial load
4. Observe crash with error code: SIGABRT

## Expected Behavior
Application should load normally regardless of cache size.

## Actual Behavior
Application crashes with memory allocation error.

## Logs
\`\`\`
[ERROR] Failed to allocate memory for cache initialization
[ERROR] SIGABRT received at 0x7fff12345678
\`\`\`

## Proposed Fix
Implement lazy loading for cached items.`,
      },
    ],
    className: 'h-full',
  },
}

export const CodeHeavyContent: Story = {
  args: {
    versions: [
      {
        id: 'v1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        actor: 'crew/gastown/jeremy',
        content: `# API Endpoint

\`\`\`typescript
function getUser(id: string) {
  return db.users.find(id)
}
\`\`\`

Returns user by ID.`,
      },
      {
        id: 'v2',
        timestamp: new Date().toISOString(),
        actor: 'polecat/townview/witness',
        content: `# API Endpoint

\`\`\`typescript
async function getUser(id: string): Promise<User | null> {
  const user = await db.users.find(id)
  if (!user) {
    throw new NotFoundError('User not found')
  }
  return user
}
\`\`\`

Returns user by ID or throws \`NotFoundError\`.

## Parameters
- \`id\`: The user's unique identifier

## Returns
- **User**: The user object if found
- **null**: If user doesn't exist`,
      },
    ],
    className: 'h-full',
  },
}

export const MinorEdits: Story = {
  args: {
    versions: [
      {
        id: 'v1',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        actor: 'mayor',
        content: 'Fix the button color on the home page. It should be blue instead of red.',
      },
      {
        id: 'v2',
        timestamp: new Date().toISOString(),
        actor: 'witness/gastown/furiosa',
        content: 'Fix the primary button color on the home page. It should be blue (#3B82F6) instead of red.',
      },
    ],
    className: 'h-full',
  },
}

export const MarkdownFeatures: Story = {
  args: {
    versions: [
      {
        id: 'v1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        actor: 'mayor',
        content: `# Feature Request

Basic feature description.`,
      },
      {
        id: 'v2',
        timestamp: new Date().toISOString(),
        actor: 'crew/gastown/jeremy',
        content: `# Feature Request

> This is an important feature for Q1 release.

## Overview
This feature adds **bold text** and *italic text* support.

## Checklist
- Item one with \`inline code\`
- Item two with [a link](https://example.com)
- Item three

## Steps
1. First step
2. Second step
3. Third step

### Sub-section
More details here with **emphasis**.`,
      },
    ],
    className: 'h-full',
  },
}
