# Notion API Integration Setup

This guide will help you set up the official Notion API integration to get fresh, working image URLs.

## Why This Fixes the Image Problem

The current codebase uses `notion-client` which is an **unofficial** reverse-engineered Notion API. This gets expired image URLs during ISR (Incremental Static Regeneration). 

The **official Notion API** provides fresh, working image URLs that don't expire for 1 hour.

## Setup Steps

### 1. Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "**+ New integration**"
3. Give it a name (e.g., "My Website Images")
4. Select the workspace that contains your pages
5. Click "**Submit**"
6. Copy the "**Internal Integration Token**" (starts with `secret_`)

### 2. Grant Page Access

1. Go to your Notion page (the root page used in `site.config.js`)
2. Click the "**...**" menu in the top right
3. Click "**Add connections**"
4. Select your integration
5. Click "**Confirm**"

### 3. Set Environment Variable

Add this to your `.env.local` file:

```bash
NOTION_TOKEN=secret_your_integration_token_here
```

### 4. Deploy to Vercel

Add the environment variable to your Vercel deployment:

1. Go to your Vercel dashboard
2. Select your project
3. Go to "**Settings**" → "**Environment Variables**"
4. Add:
   - **Name**: `NOTION_TOKEN`
   - **Value**: `secret_your_integration_token_here`
   - **Environment**: Production (and Preview if you want)

## How It Works

1. **Image Request**: Browser requests an image through the proxy
2. **URL Fails**: If the original URL returns 403/400 (expired)
3. **Extract Block ID**: The proxy extracts the block ID from the URL
4. **Fresh URL**: Calls the official Notion API to get a fresh URL
5. **Retry**: Fetches the image using the fresh URL
6. **Success**: Returns the image to the browser

## Testing

1. **Without Token**: Images will fail with expired URLs (current behavior)
2. **With Token**: Images should load correctly using fresh URLs

Test the fresh URL API directly:
```bash
curl "http://localhost:3000/api/fresh-notion-image?blockId=your-block-id"
```

## Block ID Extraction

The system automatically extracts block IDs from these URL patterns:

- `s3-us-west-2.amazonaws.com/secure.notion-static.com/BLOCK-ID/filename`
- `prod-files-secure.s3.us-west-2.amazonaws.com/workspace-id/BLOCK-ID/filename`
- `file.notion.so/f/f/workspace-id/BLOCK-ID/filename`

## Troubleshooting

### "No Notion API token configured"
- Make sure `NOTION_TOKEN` is set in your environment variables
- Restart your development server after adding the token

### "unauthorized" or "object_not_found"
- Make sure you've granted your integration access to the page
- Check that the block ID is correct
- Ensure the integration has the right permissions

### "Block not found"
- The block might not exist or might not be an image block
- Check that the URL parsing is extracting the correct block ID

## Benefits

✅ **Fresh URLs**: Always get working image URLs from Notion
✅ **Automatic Fallback**: Falls back to fresh URLs when original URLs fail
✅ **1-Hour Caching**: Fresh URLs are cached for optimal performance
✅ **Official API**: Uses Notion's official, supported API
✅ **No Code Changes**: Works with your existing image proxy setup

This solution provides the best of both worlds: the performance of cached URLs with the reliability of fresh URLs when needed.