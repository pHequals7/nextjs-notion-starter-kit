// pages/api/test-image-proxy.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Test URLs for different Notion image types
  const testUrls = [
    'https://file.notion.so/example-image.png',
    'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/example-image.png',
    'https://images.unsplash.com/photo-1234567890',
    'https://invalid-domain.com/image.png', // Should be blocked
    'not-a-valid-url' // Should be rejected
  ]

  const results = []

  for (const testUrl of testUrls) {
    try {
      // Test the image proxy endpoint
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(testUrl)}`
      
      // For a real test, we would fetch this URL
      // const response = await fetch(`http://localhost:3000${proxyUrl}`)
      
      results.push({
        originalUrl: testUrl,
        proxyUrl,
        status: 'would_test' // In reality, we'd check the actual response
      })
    } catch (error) {
      results.push({
        originalUrl: testUrl,
        error: error.message,
        status: 'error'
      })
    }
  }

  res.status(200).json({
    message: 'Image proxy test results',
    results,
    instructions: [
      '1. Deploy your site to Vercel or run `npm run dev`',
      '2. Test the image proxy by visiting: /api/image-proxy?url=https://file.notion.so/example-image.png',
      '3. Check browser Network tab for successful image loads',
      '4. Check Vercel Function logs for debugging info'
    ]
  })
}