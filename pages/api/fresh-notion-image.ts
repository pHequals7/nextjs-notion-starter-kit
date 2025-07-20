// pages/api/fresh-notion-image.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Client } from '@notionhq/client'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { blockId } = req.query as { blockId: string }

    if (!blockId) {
      return res.status(400).json({ error: 'Missing blockId parameter' })
    }

    // Check if we have a Notion API token
    const notionToken = process.env.NOTION_TOKEN
    if (!notionToken) {
      return res.status(500).json({ 
        error: 'No Notion API token configured',
        instructions: 'Set NOTION_TOKEN environment variable with your Notion integration token'
      })
    }

    // Initialize the official Notion client
    const notion = new Client({
      auth: notionToken,
    })

    console.log(`[Fresh Notion Image] Fetching fresh image URL for block: ${blockId}`)

    let imageUrl = null
    let objectType = 'block'

    try {
      // First, try to get it as a block
      const block = await notion.blocks.retrieve({
        block_id: blockId
      })

      console.log(`[Fresh Notion Image] Block type: ${block.type}`)

      // Handle different block types that can contain images
      if (block.type === 'image' && 'image' in block) {
        if (block.image.type === 'file') {
          imageUrl = block.image.file.url
        } else if (block.image.type === 'external') {
          imageUrl = block.image.external.url
        }
      }

      // If no image found in block, try to retrieve as a page (for child_page blocks or any block that might also be a page)
      if (!imageUrl) {
        objectType = `${block.type} block`
        console.log(`[Fresh Notion Image] No image found in ${objectType}, trying as page...`)
        
        try {
          const page = await notion.pages.retrieve({ page_id: blockId })
          objectType = 'page'

          console.log(`[Fresh Notion Image] Retrieved page successfully`)

          // Check page cover
          if ('cover' in page && page.cover) {
            if (page.cover.type === 'file') {
              imageUrl = page.cover.file.url
              console.log(`[Fresh Notion Image] Found page cover (file): ${imageUrl.substring(0, 100)}...`)
            } else if (page.cover.type === 'external') {
              imageUrl = page.cover.external.url
              console.log(`[Fresh Notion Image] Found page cover (external): ${imageUrl.substring(0, 100)}...`)
            }
          }

          // Check page icon if no cover found
          if (!imageUrl && 'icon' in page && page.icon) {
            if (page.icon.type === 'file') {
              imageUrl = page.icon.file.url
              console.log(`[Fresh Notion Image] Found page icon (file): ${imageUrl.substring(0, 100)}...`)
            } else if (page.icon.type === 'external') {
              imageUrl = page.icon.external.url
              console.log(`[Fresh Notion Image] Found page icon (external): ${imageUrl.substring(0, 100)}...`)
            }
          }
        } catch (pageError) {
          console.error('[Fresh Notion Image] Error accessing as page:', pageError.message)
        }
      }
    } catch (blockError) {
      // If block retrieval fails entirely, try as a page
      console.log(`[Fresh Notion Image] Block retrieval failed, trying as page...`)
      try {
        const page = await notion.pages.retrieve({ page_id: blockId })
        objectType = 'page'

        console.log(`[Fresh Notion Image] Retrieved page successfully`)

        // Check page cover
        if ('cover' in page && page.cover) {
          if (page.cover.type === 'file') {
            imageUrl = page.cover.file.url
            console.log(`[Fresh Notion Image] Found page cover (file): ${imageUrl.substring(0, 100)}...`)
          } else if (page.cover.type === 'external') {
            imageUrl = page.cover.external.url
            console.log(`[Fresh Notion Image] Found page cover (external): ${imageUrl.substring(0, 100)}...`)
          }
        }

        // Check page icon if no cover found
        if (!imageUrl && 'icon' in page && page.icon) {
          if (page.icon.type === 'file') {
            imageUrl = page.icon.file.url
            console.log(`[Fresh Notion Image] Found page icon (file): ${imageUrl.substring(0, 100)}...`)
          } else if (page.icon.type === 'external') {
            imageUrl = page.icon.external.url
            console.log(`[Fresh Notion Image] Found page icon (external): ${imageUrl.substring(0, 100)}...`)
          }
        }
      } catch (pageError) {
        console.error('[Fresh Notion Image] Error accessing as page:', pageError.message)
      }
    }

    if (!imageUrl) {
      return res.status(404).json({ 
        error: 'No image found in this block or page',
        objectType: objectType,
        blockId 
      })
    }

    console.log(`[Fresh Notion Image] Found fresh image URL: ${imageUrl.substring(0, 100)}...`)

    // Return the fresh image URL
    res.status(200).json({
      success: true,
      imageUrl,
      blockId,
      objectType: objectType,
      expires: 'This URL is valid for 1 hour from Notion'
    })

  } catch (error) {
    console.error('[Fresh Notion Image] Error:', error)
    
    if (error.code === 'object_not_found') {
      return res.status(404).json({ 
        error: 'Block not found',
        details: 'The block might not exist or your Notion integration might not have access to it'
      })
    }

    if (error.code === 'unauthorized') {
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'Check your Notion integration token and permissions'
      })
    }

    res.status(500).json({ 
      error: 'Failed to fetch fresh image URL',
      details: error.message
    })
  }
}