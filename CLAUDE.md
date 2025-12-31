# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a personal website for Pranav Hari with a **desktop-style interface** inspired by macOS. The site features draggable windows, a dock, sticky notes, and folder navigation - creating an interactive desktop experience in the browser.

### Architecture Evolution
- **Original**: Notion-based CMS using `react-notion-x` (legacy, in root directory)
- **Current**: Pure markdown content with Next.js 14 desktop UI (in `/site/` directory)

## Project Structure

```
nextjs-notion-starter-kit/
├── site/                      # ← ACTIVE: New desktop-style website
│   ├── src/
│   │   ├── app/               # Next.js 14 App Router pages
│   │   ├── components/
│   │   │   ├── desktop/       # Desktop UI components
│   │   │   └── windows/       # Window content components
│   │   ├── contexts/          # React contexts (WindowContext)
│   │   ├── lib/               # Content utilities
│   │   └── styles/            # Global CSS
│   ├── public/images/         # Static images
│   └── theme.config.ts        # Design system configuration
├── content/                   # Markdown content (articles, images)
│   ├── articles/              # Blog posts with YAML frontmatter
│   ├── images/                # Article images
│   └── pages/                 # Static pages (sightings)
├── pranav-ubuntu/             # Reference: Ubuntu-style desktop prototype
└── [legacy Notion files]      # Original Notion-based site (deprecated)
```

## Development Commands

### New Site (`/site/` directory)
```bash
cd site
npm run dev              # Start dev server (default: localhost:3000)
npm run dev -- -p 5003   # Start on custom port
npm run build            # Production build
npm run start            # Start production server
```

### Legacy Site (root directory - deprecated)
```bash
npm run dev              # Original Notion-based site
```

## Desktop UI Architecture

### Core Components

| Component | Path | Purpose |
|-----------|------|---------|
| `WindowContext` | `/site/src/contexts/WindowContext.tsx` | Window state management (open, close, focus, drag) |
| `Window` | `/site/src/components/desktop/Window.tsx` | Draggable window with macOS traffic light buttons |
| `Desktop` | `/site/src/components/desktop/Desktop.tsx` | Main desktop container |
| `Dock` | `/site/src/components/desktop/Dock.tsx` | Left vertical dock with app icons |
| `DesktopClient` | `/site/src/components/desktop/DesktopClient.tsx` | Client-side desktop wrapper |

### Desktop Widgets

| Widget | Path | Purpose |
|--------|------|---------|
| `StickyNote` | `/site/src/components/desktop/widgets/StickyNote.tsx` | Colored sticky notes |
| `FolderIcon` | `/site/src/components/desktop/widgets/FolderIcon.tsx` | Folder icons with badge count |
| `MiniCard` | `/site/src/components/desktop/widgets/MiniCard.tsx` | Article preview cards |
| `SocialWidget` | `/site/src/components/desktop/widgets/SocialWidget.tsx` | Social media links |

### Window Content Components

| Component | Path | Purpose |
|-----------|------|---------|
| `ArticleWindow` | `/site/src/components/windows/ArticleWindow.tsx` | Displays markdown articles |
| `FolderWindow` | `/site/src/components/windows/FolderWindow.tsx` | Lists articles/projects |
| `AboutWindow` | `/site/src/components/windows/AboutWindow.tsx` | About me content |

### Window State Management

```typescript
interface WindowState {
  id: string;
  type: 'article' | 'folder' | 'about' | 'widget';
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  contentProps?: Record<string, unknown>;
}
```

## Content System

### Adding New Articles

1. Create a markdown file in `/content/articles/`:
```markdown
---
title: "Article Title"
date: "2024-01-15"
tags: ["Tech", "AI"]
description: "Brief description for previews"
cover: "/images/cover-image.jpg"
---

Your markdown content here...
```

2. Add any images to `/content/images/` and `/site/public/images/`

3. The article automatically appears in the Writing folder

### Content Utilities

- `getArticles()` - Returns all published articles sorted by date
- `getArticle(slug)` - Returns a specific article by slug
- `getAllTags()` - Returns unique tags across all articles
- `getProjects()` - Returns project list (hardcoded in `content.ts`)

## Design System

### Theme Configuration (`/site/theme.config.ts`)

Controls colors, fonts, social links, and navigation:

```typescript
export const theme = {
  site: { name, title, description, url },
  colors: {
    light: { background: "#FAF9F6", accent: "#E07A5F", ... },
    dark: { background: "#1a1a1a", accent: "#F4A261", ... },
  },
  social: { twitter, github, linkedin, email },
  nav: [{ label, href }, ...],
};
```

### Visual Features

- **macOS-style windows**: Traffic light buttons (red/yellow/green) on left
- **Frosted glass dock**: Backdrop blur with translucent background
- **Sticky notes**: Draggable colored notes with tape effect
- **Dark mode**: System-adaptive via `next-themes`

## Key Dependencies

### Site (`/site/package.json`)
- **Next.js 14.2.35**: App Router, Server Components
- **React 18**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **next-themes**: Dark mode
- **react-markdown**: Markdown rendering
- **remark-gfm**: GitHub-flavored markdown
- **rehype-raw**: HTML in markdown
- **lucide-react**: Icons
- **date-fns**: Date formatting
- **gray-matter**: YAML frontmatter parsing

## Embedded Content

Articles support embedded content from:
- **Spotify**: `[Embedded content](https://open.spotify.com/embed/...)`
- **YouTube**: `[Embedded content](https://www.youtube.com/embed/...)`
- **HTML**: `<details>/<summary>` collapsible sections

These are auto-detected and rendered as iframes by `ArticleContent.tsx`.

## File Locations Quick Reference

| What | Where |
|------|-------|
| Main page | `/site/src/app/page.tsx` |
| Layout | `/site/src/app/layout.tsx` |
| Theme config | `/site/theme.config.ts` |
| Window logic | `/site/src/contexts/WindowContext.tsx` |
| Content reader | `/site/src/lib/content.ts` |
| Article markdown | `/content/articles/*.md` |
| Images | `/content/images/` and `/site/public/images/` |
| Global styles | `/site/src/styles/globals.css` |

## Development Notes

### Server vs Client Components
- `page.tsx` is a server component (reads markdown with `fs`)
- `DesktopClient.tsx` is a client component (handles interactivity)
- Data is passed from server to client via props

### Adding New Window Types
1. Add type to `WindowType` in `WindowContext.tsx`
2. Create content component in `/components/windows/`
3. Add case to `renderWindowContent` in `DesktopClient.tsx`

### Mobile Responsiveness
Currently desktop-focused. Mobile improvements needed:
- Hide dock on small screens
- Convert windows to full-screen modals
- Stack widgets vertically

## Legacy Notion Site (Deprecated)

The original Notion-based site files remain in the root directory but are no longer actively developed. Key files:
- `site.config.js` - Notion page ID and settings
- `lib/notion.ts` - Notion API client
- `pages/[pageId].tsx` - Dynamic Notion page rendering
