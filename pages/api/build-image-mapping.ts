// pages/api/build-image-mapping.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Client } from '@notionhq/client'

// Cache for the mapping to avoid rebuilding too frequently
let imageMapping: Record<string, string> = {}
let lastBuildTime = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

async function buildImageMapping() {
  const notionToken = process.env.NOTION_TOKEN
  if (!notionToken) {
    throw new Error('No Notion API token configured')
  }

  const notion = new Client({ auth: notionToken })
  const mapping: Record<string, string> = {}

  // Start with the root page
  const rootPageId = 'fc92efc512024561b080d5cff9a77dbe'
  
  console.log(`[Build Image Mapping] Starting with root page: ${rootPageId}`)

  // Function to process a page and its children
  async function processPage(pageId: string, depth = 0) {
    try {
      if (depth > 5) return // Prevent infinite recursion
      
      console.log(`[Build Image Mapping] Processing page: ${pageId} (depth: ${depth})`)
      
      // Get all child blocks
      const blocks = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100
      })

      for (const block of blocks.results) {
        // Process image blocks
        if (block.type === 'image' && 'image' in block) {
          let imageUrl = null
          
          if (block.image.type === 'file') {
            imageUrl = block.image.file.url
          } else if (block.image.type === 'external') {
            imageUrl = block.image.external.url
          }

          if (imageUrl) {
            // Extract file ID from the URL
            const fileId = extractFileIdFromUrl(imageUrl)
            if (fileId) {
              mapping[fileId] = block.id
              console.log(`[Build Image Mapping] Mapped file ID ${fileId} -> block ID ${block.id}`)
              console.log(`[Build Image Mapping] Image URL: ${imageUrl.substring(0, 100)}...`)
            }
          }
        }

        // Process child databases
        if (block.type === 'child_database') {
          try {
            const database = await notion.databases.query({
              database_id: block.id,
              page_size: 50
            })

            for (const page of database.results) {
              if (page.object === 'page') {
                console.log(`[Build Image Mapping] Processing database page: ${page.id}`)
                
                // Check page properties for images (like cover images)
                if ('cover' in page && page.cover) {
                  let coverUrl = null
                  if (page.cover.type === 'file') {
                    coverUrl = page.cover.file.url
                  } else if (page.cover.type === 'external') {
                    coverUrl = page.cover.external.url
                  }
                  
                  if (coverUrl) {
                    const fileId = extractFileIdFromUrl(coverUrl)
                    if (fileId) {
                      mapping[fileId] = page.id
                      console.log(`[Build Image Mapping] Mapped page cover file ID ${fileId} -> page ID ${page.id}`)
                    }
                  }
                }
                
                // Check page icon
                if ('icon' in page && page.icon) {
                  let iconUrl = null
                  if (page.icon.type === 'file') {
                    iconUrl = page.icon.file.url
                  } else if (page.icon.type === 'external') {
                    iconUrl = page.icon.external.url
                  }
                  
                  if (iconUrl) {
                    const fileId = extractFileIdFromUrl(iconUrl)
                    if (fileId) {
                      mapping[fileId] = page.id
                      console.log(`[Build Image Mapping] Mapped page icon file ID ${fileId} -> page ID ${page.id}`)
                    }
                  }
                }
                
                // Process the page content
                await processPage(page.id, depth + 1)
              }
            }
          } catch (error) {
            console.error(`[Build Image Mapping] Error processing database ${block.id}:`, error.message)
          }
        }

        // Process child pages
        if (block.has_children) {
          await processPage(block.id, depth + 1)
        }
      }
    } catch (error) {
      console.error(`[Build Image Mapping] Error processing page ${pageId}:`, error.message)
    }
  }

  // First, check the root page itself for cover/icon
  try {
    const rootPage = await notion.pages.retrieve({ page_id: rootPageId })
    
    // Check root page cover
    if ('cover' in rootPage && rootPage.cover) {
      let coverUrl = null
      if (rootPage.cover.type === 'file') {
        coverUrl = rootPage.cover.file.url
      } else if (rootPage.cover.type === 'external') {
        coverUrl = rootPage.cover.external.url
      }
      
      if (coverUrl) {
        const fileId = extractFileIdFromUrl(coverUrl)
        if (fileId) {
          mapping[fileId] = rootPageId
          console.log(`[Build Image Mapping] Mapped ROOT page cover file ID ${fileId} -> page ID ${rootPageId}`)
        }
      }
    }
    
    // Check root page icon
    if ('icon' in rootPage && rootPage.icon) {
      let iconUrl = null
      if (rootPage.icon.type === 'file') {
        iconUrl = rootPage.icon.file.url
      } else if (rootPage.icon.type === 'external') {
        iconUrl = rootPage.icon.external.url
      }
      
      if (iconUrl) {
        const fileId = extractFileIdFromUrl(iconUrl)
        if (fileId) {
          mapping[fileId] = rootPageId
          console.log(`[Build Image Mapping] Mapped ROOT page icon file ID ${fileId} -> page ID ${rootPageId}`)
        }
      }
    }
  } catch (error) {
    console.error(`[Build Image Mapping] Error processing root page metadata:`, error.message)
  }

  // Process the root page content
  await processPage(rootPageId)
  
  console.log(`[Build Image Mapping] Built mapping for ${Object.keys(mapping).length} images`)
  return mapping
}

function extractFileIdFromUrl(url: string): string | null {
  try {
    const cleanUrl = url.split('?')[0]
    
    // Pattern 1: prod-files-secure.s3.us-west-2.amazonaws.com/workspace-id/file-id/filename
    const prodMatch = cleanUrl.match(/prod-files-secure\.s3\.us-west-2\.amazonaws\.com\/[a-f0-9-]+\/([a-f0-9-]+)\//);
    if (prodMatch) {
      return prodMatch[1];
    }
    
    // Pattern 2: s3-us-west-2.amazonaws.com/secure.notion-static.com/file-id/filename
    const s3Match = cleanUrl.match(/secure\.notion-static\.com\/([a-f0-9-]+)\//);
    if (s3Match) {
      return s3Match[1];
    }
    
    // Pattern 3: file.notion.so/f/f/workspace-id/file-id/filename
    const fileMatch = cleanUrl.match(/file\.notion\.so\/f\/f\/[a-f0-9-]+\/([a-f0-9-]+)\//);
    if (fileMatch) {
      return fileMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting file ID from URL:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const now = Date.now()
    
    // Check if we need to rebuild the mapping
    if (now - lastBuildTime > CACHE_DURATION || Object.keys(imageMapping).length === 0) {
      console.log('[Build Image Mapping] Rebuilding image mapping...')
      imageMapping = await buildImageMapping()
      lastBuildTime = now
    }

    res.status(200).json({
      success: true,
      mappingCount: Object.keys(imageMapping).length,
      mapping: imageMapping,
      lastBuildTime: new Date(lastBuildTime).toISOString(),
      cacheExpiresAt: new Date(lastBuildTime + CACHE_DURATION).toISOString()
    })

  } catch (error) {
    console.error('[Build Image Mapping] Error:', error)
    res.status(500).json({
      error: 'Failed to build image mapping',
      details: error.message
    })
  }
}

// Export the mapping for use by other API routes
export { imageMapping }