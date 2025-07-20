// pages/api/test-fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Test our fetch implementation
    const fetch = await import('node-fetch').then(m => m.default)
    
    const testUrl = 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?ixlib=rb-1.2.1&q=85&fm=jpg&crop=entropy&cs=srgb'
    console.log('Testing fetch with:', testUrl)
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', response.headers)
    
    if (!response.ok) {
      return res.status(500).json({ 
        error: 'Fetch failed', 
        status: response.status,
        statusText: response.statusText
      })
    }
    
    const buffer = await response.buffer()
    console.log('Buffer length:', buffer.length)
    
    res.status(200).json({ 
      success: true, 
      status: response.status,
      contentType: response.headers.get('content-type'),
      size: buffer.length 
    })
    
  } catch (error) {
    console.error('Test fetch error:', error)
    res.status(500).json({ 
      error: 'Test failed', 
      details: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    })
  }
}