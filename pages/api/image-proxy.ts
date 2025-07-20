// pages/api/image-proxy.ts
import type { NextApiRequest, NextApiResponse } from 'next'

// Simple fetch implementation
const getFetch = async () => {
  const { default: fetch } = await import('node-fetch')
  return fetch
}

// Extract block ID from various Notion URL formats
// Note: The UUID in the URL might be the file ID, not the block ID
// We need to map file IDs to block IDs using the dynamic mapping
async function extractBlockIdFromUrl(url: string): Promise<string | null> {
  try {
    // Remove query parameters
    const cleanUrl = url.split('?')[0]
    
    // Pattern 1: Extract from S3 URL path - the UUID in the path
    // s3-us-west-2.amazonaws.com/secure.notion-static.com/UUID/filename
    const s3Match = cleanUrl.match(/secure\.notion-static\.com\/([a-f0-9-]+)\//);
    if (s3Match) {
      const fileId = s3Match[1];
      return await mapFileIdToBlockId(fileId);
    }
    
    // Pattern 2: Extract from prod-files-secure URL - the second UUID
    // prod-files-secure.s3.us-west-2.amazonaws.com/workspace-id/file-id/filename
    const prodMatch = cleanUrl.match(/prod-files-secure\.s3\.us-west-2\.amazonaws\.com\/[a-f0-9-]+\/([a-f0-9-]+)\//);
    if (prodMatch) {
      const fileId = prodMatch[1];
      return await mapFileIdToBlockId(fileId);
    }
    
    // Pattern 3: Extract from file.notion.so URL
    // file.notion.so/f/f/workspace-id/file-id/filename
    const fileMatch = cleanUrl.match(/file\.notion\.so\/f\/f\/[a-f0-9-]+\/([a-f0-9-]+)\//);
    if (fileMatch) {
      const fileId = fileMatch[1];
      return await mapFileIdToBlockId(fileId);
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting block ID from URL:', error);
    return null;
  }
}

// Map file IDs to block IDs using dynamic mapping
async function mapFileIdToBlockId(fileId: string): Promise<string | null> {
  try {
    // Try the dynamic mapping
    const response = await fetch('http://localhost:3000/api/build-image-mapping');
    if (response.ok) {
      const data = await response.json();
      const dynamicResult = data.mapping[fileId];
      if (dynamicResult) {
        console.log(`[mapFileIdToBlockId] Found in dynamic mapping: ${fileId} -> ${dynamicResult}`);
        return dynamicResult;
      }
    }
    
    // Fallback to static mapping if dynamic mapping fails
    // Only keeping verified, existing mappings
    const staticMapping = {
      '384c5dee-6a73-465d-9502-2d8706f298a3': '4dc61583-cf67-4c41-a561-396632b8b773',
      '5b69ce2d-453d-4fd4-b20b-e16ef8d69e8a': '8470d505-2dcf-4533-85f6-b62b08a4dedf',
      'bbdbd415-20df-42ff-9232-37f07a7592bb': 'b3b1516c-2f87-4129-af39-d09def518eeb',
      '801193e3-856d-492e-8f84-de24c4d2154b': 'c7d9d9a1-85a4-4bf9-8575-3ef7276c7033'
    };
    
    const staticResult = staticMapping[fileId];
    if (staticResult) {
      console.log(`[mapFileIdToBlockId] Found in static mapping: ${fileId} -> ${staticResult}`);
      return staticResult;
    }
    
    console.log(`[mapFileIdToBlockId] No mapping found for file ID: ${fileId}`);
    return null;
  } catch (error) {
    console.error('Error getting mappings:', error);
    return null;
  }
}

// Allowed domains for security - prevents proxy abuse
const ALLOWED_DOMAINS = [
  'file.notion.so',
  'www.notion.so',
  'notion.so',
  's3.us-west-2.amazonaws.com',
  's3-us-west-2.amazonaws.com',
  'prod-files-secure.s3.us-west-2.amazonaws.com',
  'secure.notion-static.com',
  'images.unsplash.com',
  'pbs.twimg.com',
  'f.notion.so',
  'img.notionusercontent.com'
]

// Function to try to convert S3 URLs to file.notion.so URLs
function tryConvertS3ToFileNotionUrl(url: string): string {
  try {
    // Pattern 1: s3-us-west-2.amazonaws.com/secure.notion-static.com/UUID/filename
    const s3Match = url.match(/s3-us-west-2\.amazonaws\.com\/secure\.notion-static\.com\/([a-f0-9-]+)\/(.+)/)
    if (s3Match) {
      const uuid = s3Match[1]
      const filename = s3Match[2]
      return `https://file.notion.so/f/f/${uuid}/${filename}`
    }
    
    // Pattern 2: prod-files-secure.s3.us-west-2.amazonaws.com/workspace-id/file-id/filename
    const prodMatch = url.match(/prod-files-secure\.s3\.us-west-2\.amazonaws\.com\/([a-f0-9-]+)\/([a-f0-9-]+)\/(.+)/)
    if (prodMatch) {
      const workspaceId = prodMatch[1]
      const fileId = prodMatch[2]
      const filename = prodMatch[3]
      return `https://file.notion.so/f/f/${workspaceId}/${fileId}/${filename}`
    }
    
    // If no pattern matches, return original URL
    return url
  } catch (error) {
    console.error(`[tryConvertS3ToFileNotionUrl] Error converting URL: ${url}`, error)
    return url
  }
}

// Maximum file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Disable Next.js body parsing for this route, essential for streaming/piping
export const config = {
  api: {
    bodyParser: false,
  }
}

function isAllowedDomain(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname
    return ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const imageUrl = req.query.url as string;

    if (!imageUrl) {
      console.error('[API Image Proxy] Error: Missing image URL parameter');
      return res.status(400).json({ error: 'Missing image URL parameter' });
    }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(imageUrl);
  } catch (e) {
    console.error(`[API Image Proxy] Error: Invalid encoding for URL: ${imageUrl}`, e);
    return res.status(400).json({ error: 'Invalid image URL parameter encoding' });
  }

  // Basic check for common protocols
  if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
     console.error(`[API Image Proxy] Error: Invalid URL protocol for: ${decodedUrl}`);
     return res.status(400).json({ error: 'Invalid image URL protocol' });
  }

  // Security check: validate domain
  if (!isAllowedDomain(decodedUrl)) {
    console.error(`[API Image Proxy] Error: Domain not allowed for: ${decodedUrl}`);
    return res.status(403).json({ error: 'Domain not allowed' });
  }

  // Store the original URL for fresh URL fallback
  const originalUrl = decodedUrl
  // Don't convert URLs initially - let them fail first, then use fresh URL fallback
  
  console.log(`[API Image Proxy] Attempting to fetch: ${decodedUrl}`);
  console.log(`[API Image Proxy] Request headers:`, req.headers);
  console.log(`[API Image Proxy] User-Agent:`, req.headers['user-agent']);

  try {
    const fetch = await getFetch()
    
    console.log(`[API Image Proxy] Trying URL: ${decodedUrl}`)
    
    // Fetch the image from the original source server-side
    const response = await fetch(decodedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    console.log(`[API Image Proxy] Response status: ${response.status}`)

    // Check if the fetch was successful (status code 200-299)
    if (!response.ok) { 
        const errorBody = await response.text().catch(() => 'Could not read error body'); // Safely get error text
        console.error(`[API Image Proxy] Fetch failed for ${decodedUrl}: Status ${response.status}`);
        console.error(`[API Image Proxy] Response headers:`, response.headers);
        console.error(`[API Image Proxy] Error Body: ${errorBody.substring(0, 200)}...`); // Log part of the error body
        
        // Special handling for Notion URLs that might be expired
        if ((response.status === 403 || response.status === 400) && 
            (decodedUrl.includes('notion') || decodedUrl.includes('amazonaws'))) {
          console.log(`[API Image Proxy] Attempting to get fresh Notion URL for: ${decodedUrl}`);
          
          // Try to extract file ID and create modern img.notionusercontent.com URL
          const actualFileIdMatch = decodedUrl.match(/secure\.notion-static\.com\/([a-f0-9-]+)\//) || 
                                   decodedUrl.match(/prod-files-secure\.s3\.us-west-2\.amazonaws\.com\/[a-f0-9-]+\/([a-f0-9-]+)\//);
          const extractedFileId = actualFileIdMatch ? actualFileIdMatch[1] : null;
          console.log(`[API Image Proxy] Extracted file ID: ${extractedFileId} from URL: ${decodedUrl}`);
          
          if (extractedFileId) {
            // Try to get block ID mapping
            const blockId = await mapFileIdToBlockId(extractedFileId);
            console.log(`[API Image Proxy] Mapped to block ID: ${blockId}`);
            
            if (blockId) {
              // Try modern img.notionusercontent.com URL pattern
              const filename = decodedUrl.split('/').pop()?.split('?')[0] || 'image.jpg';
              const modernUrl = `https://img.notionusercontent.com/s3/prod-files-secure%2F53b92ce5-f4af-4f58-87cf-32c6a095c88b%2F${extractedFileId}%2F${encodeURIComponent(filename)}/size/w=2000?table=block&id=${blockId}&cache=v2`;
              
              console.log(`[API Image Proxy] Trying modern URL: ${modernUrl.substring(0, 100)}...`);
              
              try {
                const modernResponse = await fetch(modernUrl, {
                  method: 'GET',
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                  }
                });
                
                if (modernResponse.ok) {
                  console.log(`[API Image Proxy] Success with modern URL!`);
                  
                  const buffer = await modernResponse.buffer();
                  const contentType = modernResponse.headers.get('content-type') || 'application/octet-stream';
                  
                  res.setHeader('Content-Type', contentType);
                  res.setHeader('Content-Length', buffer.length.toString());
                  res.setHeader('Cache-Control', 'public, max-age=3600');
                  
                  return res.status(200).send(buffer);
                } else {
                  console.log(`[API Image Proxy] Modern URL failed: ${modernResponse.status}`);
                }
              } catch (modernError) {
                console.error(`[API Image Proxy] Modern URL error:`, modernError.message);
              }
            }
            
            // Fallback to official API method
            try {
              const freshUrlResponse = await fetch(`${req.headers.host ? `http://${req.headers.host}` : 'http://localhost:3000'}/api/fresh-notion-image?blockId=${blockId}`);
              if (freshUrlResponse.ok) {
                const freshData = await freshUrlResponse.json();
                console.log(`[API Image Proxy] Got fresh URL, retrying with: ${freshData.imageUrl.substring(0, 100)}...`);
                
                // Retry with the fresh URL
                const retryResponse = await fetch(freshData.imageUrl, {
                  method: 'GET',
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                  }
                });
                
                if (retryResponse.ok) {
                  console.log(`[API Image Proxy] Success with fresh URL!`);
                  
                  // Use the fresh response
                  const buffer = await retryResponse.buffer();
                  const contentType = retryResponse.headers.get('content-type') || 'application/octet-stream';
                  
                  res.setHeader('Content-Type', contentType);
                  res.setHeader('Content-Length', buffer.length.toString());
                  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour since Notion URLs expire
                  
                  return res.status(200).send(buffer);
                }
              }
            } catch (freshError) {
              console.error(`[API Image Proxy] Failed to get fresh URL:`, freshError.message);
            }
          }
        }
        
        return res.status(response.status || 502).json({ 
          error: `Image origin failed: ${response.status}`,
          url: decodedUrl.substring(0, 100), // Truncate URL for security
          details: response.status === 403 ? 'Image URL might be expired or require authentication' : undefined
        });
    }

    // Get the content type and validate it's an image
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      console.error(`[API Image Proxy] Non-image content type: ${contentType} for ${decodedUrl}`);
      return res.status(400).json({ error: 'URL does not point to an image' });
    }

    // Get content length and validate size
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      console.error(`[API Image Proxy] File too large: ${contentLength} bytes for ${decodedUrl}`);
      return res.status(413).json({ error: 'Image file too large' });
    }

    // Get the data buffer
    const buffer = await response.buffer(); 

    // Double-check buffer size
    if (buffer.length > MAX_FILE_SIZE) {
      console.error(`[API Image Proxy] Buffer too large: ${buffer.length} bytes for ${decodedUrl}`);
      return res.status(413).json({ error: 'Image file too large' });
    }

    console.log(`[API Image Proxy] Success fetching ${decodedUrl}. Content-Type: ${contentType}, Size: ${buffer.length}`);

    // Send the image data back to the client's browser
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length.toString());
    
    // Set caching headers based on environment
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      // Short cache in development for easier debugging
      res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate'); // 5 minutes
    } else {
      // Long cache in production
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
    }
    
    // Add additional headers for better caching
    res.setHeader('ETag', `"${Buffer.from(decodedUrl).toString('base64').slice(0, 16)}"`);
    res.setHeader('Vary', 'Accept-Encoding');
    
    res.status(200).send(buffer);

  } catch (error: any) {
    console.error(`[API Image Proxy] Network or other error for ${decodedUrl}:`, error);
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timeout' });
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(502).json({ error: 'Could not connect to image source' });
    }
    
    // Generic error response - avoid sending potentially sensitive error details to the client
    res.status(500).json({ error: 'Error fetching image via proxy' }); 
  }
  } catch (outerError) {
    console.error('[API Image Proxy] Outer catch error:', outerError);
    res.status(500).json({ error: 'Internal server error', details: outerError.message });
  }
} 