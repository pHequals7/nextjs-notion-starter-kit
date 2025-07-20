// pages/api/test-block-id.ts
import type { NextApiRequest, NextApiResponse } from 'next'

// Extract block ID from various Notion URL formats
function extractBlockIdFromUrl(url: string): string | null {
  try {
    // Remove query parameters
    const cleanUrl = url.split('?')[0]
    
    // Pattern 1: Extract from S3 URL path - the UUID in the path
    // s3-us-west-2.amazonaws.com/secure.notion-static.com/UUID/filename
    const s3Match = cleanUrl.match(/secure\.notion-static\.com\/([a-f0-9-]+)\//);
    if (s3Match) {
      return s3Match[1];
    }
    
    // Pattern 2: Extract from prod-files-secure URL - the second UUID
    // prod-files-secure.s3.us-west-2.amazonaws.com/workspace-id/file-id/filename
    const prodMatch = cleanUrl.match(/prod-files-secure\.s3\.us-west-2\.amazonaws\.com\/[a-f0-9-]+\/([a-f0-9-]+)\//);
    if (prodMatch) {
      return prodMatch[1];
    }
    
    // Pattern 3: Extract from file.notion.so URL
    // file.notion.so/f/f/workspace-id/file-id/filename
    const fileMatch = cleanUrl.match(/file\.notion\.so\/f\/f\/[a-f0-9-]+\/([a-f0-9-]+)\//);
    if (fileMatch) {
      return fileMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting block ID from URL:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.query as { url: string }

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  const blockId = extractBlockIdFromUrl(url)
  
  res.status(200).json({
    inputUrl: url,
    extractedBlockId: blockId,
    success: !!blockId,
    message: blockId ? 'Block ID extracted successfully' : 'Could not extract block ID from URL'
  })
}