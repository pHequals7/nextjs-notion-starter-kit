// pages/api/image-proxy.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import got from 'got' // Using 'got' as it was likely used elsewhere

// Disable Next.js bodyParser for this route, as we need the raw stream/buffer
export const config = {
  api: {
    bodyParser: false,
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const imageUrl = req.query.url as string; // Get URL from query param

  if (!imageUrl) {
    res.status(400).send('Missing image URL parameter');
    return;
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(imageUrl);
  } catch (e) {
    res.status(400).send('Invalid image URL parameter encoding');
    return;
  }

  console.log(`[API Image Proxy] Attempting to fetch: ${decodedUrl}`);

  try {
    // Create a readable stream by requesting the image URL server-side
    const imageStream = got.stream(decodedUrl, {
        // Important: Let got handle redirects automatically
        followRedirect: true, 
        // Increase timeout slightly if needed
        timeout: { request: 15000 }, // 15 seconds timeout
        // Don't throw errors on non-200 responses immediately
        throwHttpErrors: false,
    });

    // Handle potential errors *during* the fetch stream setup
    imageStream.on('error', (error) => {
      console.error(`[API Image Proxy] Stream setup error for ${decodedUrl}:`, error);
      if (!res.headersSent) {
         res.status(500).send(`Failed to fetch image stream: ${error.message}`);
      }
    });

    // Pipe the headers and data from the fetched image back to the client response
    imageStream.on('response', (response) => {
      if (response.statusCode !== 200) {
        console.error(`[API Image Proxy] Fetch failed for ${decodedUrl}: Status ${response.statusCode}`);
        res.status(response.statusCode || 500).send(`Failed upstream: ${response.statusCode}`);
        // Destroy the stream to prevent further processing
        imageStream.destroy(); 
        return;
      }

      // Success! Get content type and length from the source response
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const contentLength = response.headers['content-length'];

      console.log(`[API Image Proxy] Success fetching ${decodedUrl}. Content-Type: ${contentType}`);

      // Set headers for the client response
      res.setHeader('Content-Type', contentType);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      // Add caching headers - cache for 1 year on CDN and browser
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); 
      res.status(200); // Set status before piping

      // Pipe the image data directly to the client response
      imageStream.pipe(res); 
    });

  } catch (error: any) {
    // Catch synchronous errors during initial got() call (unlikely with stream)
    console.error(`[API Image Proxy] Sync error for ${imageUrl}:`, error);
    if (!res.headersSent) {
        res.status(500).send(`Error fetching image: ${error.message}`);
    }
  }
}