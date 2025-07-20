# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js blog/website starter kit that uses Notion as a CMS. The project fetches content from Notion pages and renders them as static websites using Next.js and the `react-notion-x` library.

## Common Development Commands

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run deploy` - Deploy to Vercel

### Testing & Quality
- `npm run test` - Run all tests (lint and prettier)
- `npm run test:lint` - Run ESLint on TypeScript files
- `npm run test:prettier` - Check Prettier formatting

### Analysis
- `npm run analyze` - Analyze bundle size
- `npm run analyze:server` - Analyze server bundle
- `npm run analyze:browser` - Analyze browser bundle

## Architecture Overview

### Core Configuration
- **Site Configuration**: `site.config.js` contains all site-wide settings including the root Notion page ID, social links, and feature flags
- **App Configuration**: `lib/config.ts` processes site config and environment variables into typed configuration objects
- **Environment Variables**: Optional features like Firebase preview images, Fathom analytics, and Google credentials are configured via environment variables

### Data Layer
- **Notion API**: `lib/notion.ts` handles all Notion API interactions using the `notion-client` library
- **Page Resolution**: `lib/resolve-notion-page.ts` converts Notion page IDs to routable pages
- **Image Processing**: `lib/map-image-url.ts` handles image URL mapping and CDN proxying
- **Preview Images**: `lib/get-preview-images.ts` generates LQIP (Low Quality Image Placeholder) using Firebase

### Routing & Pages
- **Dynamic Pages**: `pages/[pageId].tsx` handles all Notion page rendering
- **URL Mapping**: `lib/map-page-url.ts` converts Notion page IDs to SEO-friendly URLs
- **Canonical URLs**: `lib/get-canonical-page-id.ts` resolves page URLs to canonical Notion page IDs

### Components
- **NotionPage**: Main component for rendering Notion content using `react-notion-x`
- **PageHead**: SEO metadata and open graph tags
- **PageSocial**: Social media sharing buttons
- **Footer**: Site footer with dark mode toggle
- **ReactUtterances**: GitHub-based comments system

### Styling
- **Global Styles**: `styles/global.css` for site-wide styles
- **Notion Styles**: `styles/notion.css` for customizing Notion content appearance
- **Prism Themes**: `styles/prism-theme.css` for code syntax highlighting
- **Dark Mode**: Built-in dark mode support using `@fisch0920/use-dark-mode`

### API Routes
- **Image Proxy**: `pages/api/image-proxy.ts` proxies external images
- **Search**: `api/search-notion.ts` enables site-wide search functionality
- **Preview Images**: `api/create-preview-image.ts` generates preview images for Firebase
- **Sitemaps**: `api/sitemap.xml.ts` generates XML sitemaps
- **Robots**: `api/robots.txt.ts` generates robots.txt

## Key Dependencies

### Core Framework
- **Next.js 12.3.1**: React framework for SSG/SSR
- **React 18.2.0**: UI library
- **TypeScript 4.8.4**: Type checking

### Notion Integration
- **notion-client**: Official Notion API client
- **react-notion-x**: React components for rendering Notion content
- **notion-types**: TypeScript types for Notion API
- **notion-utils**: Utility functions for Notion data

### Optional Features
- **Firebase**: For LQIP preview images (requires `GOOGLE_APPLICATION_CREDENTIALS`, `GCLOUD_PROJECT`, `FIREBASE_COLLECTION_IMAGES`)
- **Fathom Analytics**: Privacy-focused analytics (requires `NEXT_PUBLIC_FATHOM_ID`)
- **Utterances**: GitHub-based comments (configure `utterancesGitHubRepo` in site config)

## Development Notes

### Configuration Priority
1. Environment variables take precedence over site.config.js
2. Site.config.js provides defaults and required settings
3. Feature flags in site.config.js control optional functionality

### Image Handling
- All images are processed through the image proxy API route
- Preview images (LQIP) are generated on-demand and cached in Firebase
- Image domains must be added to `next.config.js` for Next.js Image optimization

### URL Structure
- Development: includes Notion page ID in URLs for debugging
- Production: uses clean URLs without Notion IDs
- URL overrides can be configured in `site.config.js`

### Build Process
- TypeScript build errors are ignored (`ignoreBuildErrors: true`)
- Bundle analyzer is available for optimization
- All pages are statically generated at build time

## Testing

The project uses ESLint and Prettier for code quality. Run `npm run test` to check both linting and formatting before committing changes.