// pages/api/simple-proxy.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const imageUrl = req.query.url as string;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Missing image URL parameter' });
    }

    const decodedUrl = decodeURIComponent(imageUrl);
    console.log('Trying to fetch:', decodedUrl);

    const fetch = await import('node-fetch').then(m => m.default)
    
    const response = await fetch(decodedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error text');
      return res.status(response.status).json({ 
        error: 'Fetch failed', 
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 200)
      });
    }

    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length.toString());
    res.status(200).send(buffer);

  } catch (error) {
    console.error('Simple proxy error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    });
  }
}