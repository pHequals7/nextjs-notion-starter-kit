// pages/api/image-proxy.ts
import type { NextApiRequest, NextApiResponse } from 'next'
// Use require for node-fetch v2 to ensure CommonJS compatibility
const fetch = require('node-fetch'); 
// You might need to install node-fetch v2: yarn add node-fetch@^2.6.7
// You might need to install types: yarn add --dev @types/node-fetch@^2.6.1

// Disable Next.js body parsing for this route, essential for streaming/piping
export const config = {
  api: {
    bodyParser: false,
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const imageUrl = req.query.url as string;

  if (!imageUrl) {
    console.error('[API Image Proxy] Error: Missing image URL parameter');
    return res.status(400).send('Missing image URL parameter');
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(imageUrl);
  } catch (e) {
    console.error(`[API Image Proxy] Error: Invalid encoding for URL: ${imageUrl}`, e);
    return res.status(400).send('Invalid image URL parameter encoding');
  }

  // Basic check for common protocols
  if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
     console.error(`[API Image Proxy] Error: Invalid URL protocol for: ${decodedUrl}`);
     return res.status(400).send('Invalid image URL protocol');
  }

  console.log(`[API Image Proxy] Attempting to fetch: ${decodedUrl}`);

  try {
    // Fetch the image from the original source server-side
    const response = await fetch(decodedUrl, {
        redirect: 'follow', // Follow redirects automatically
        timeout: 20000, // Increase timeout to 20 seconds
        headers: { // Try to mimic a browser request
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36', // Use a plausible user agent
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.notion.so/' // Adding a Notion referer *might* sometimes help
        }
    });

    // Check if the fetch was successful (status code 200-299)
    if (!response.ok) { 
        const errorBody = await response.text().catch(() => 'Could not read error body'); // Safely get error text
        console.error(`[API Image Proxy] Fetch failed for ${decodedUrl}: Status ${response.status}`);
        console.error(`[API Image Proxy] Error Body: ${errorBody.substring(0, 200)}...`); // Log part of the error body
        return res.status(response.status || 502).send(`Image origin failed: ${response.status}`);
    }

    // Get the content type and data buffer
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.buffer(); 

    console.log(`[API Image Proxy] Success fetching ${decodedUrl}. Content-Type: ${contentType}, Size: ${buffer.length}`);

    // Send the image data back to the client's browser
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length.toString());
    // Set aggressive caching headers - tells browser/CDN to cache for 1 year
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); 
    res.status(200).send(buffer);

  } catch (error: any) {
    console.error(`[API Image Proxy] Network or other error for ${decodedUrl}:`, error);
    // Avoid sending potentially sensitive error details to the client
    res.status(500).send('Error fetching image via proxy'); 
  }
} 