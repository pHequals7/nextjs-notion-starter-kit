import { Block } from 'notion-types'
import { imageCDNHost } from './config'

export const mapNotionImageUrl = (url: string, block: Block) => {
  if (!url) {
    return null
  }

  if (url.startsWith('data:')) {
    return url
  }
  
  // Handle signed URLs from Notion (new format)
  if (url.startsWith('https://file.notion.so') && url.includes('expirationTimestamp')) {
    return url // Return signed URLs as is
  }

  if (imageCDNHost && url.startsWith(imageCDNHost)) {
    return url
  }

  if (url.startsWith('/images')) {
    url = `https://www.notion.so${url}`
  }

  // Handle Unsplash images
  if (url.startsWith('https://images.unsplash.com')) {
    return url
  }

  // Handle S3 URLs (Notion's storage)
  if (url.startsWith('https://s3') || url.includes('amazonaws.com')) {
    return url
  }

  // Default case - use Notion's proxy
  url = `https://www.notion.so${
    url.startsWith('/image') ? url : `/image/${encodeURIComponent(url)}`
  }`

  const notionImageUrlV2 = new URL(url)
  let table = block.parent_table === 'space' ? 'block' : block.parent_table
  if (table === 'collection') {
    table = 'block'
  }
  notionImageUrlV2.searchParams.set('table', table)
  notionImageUrlV2.searchParams.set('id', block.id)
  notionImageUrlV2.searchParams.set('cache', 'v2')

  url = notionImageUrlV2.toString()
  
  return mapImageUrl(url)
}

export const mapImageUrl = (imageUrl: string) => {
  if (!imageUrl) {
    return null
  }
  
  if (imageUrl.startsWith('data:')) {
    return imageUrl
  }

  // Ensure Notion's signed URLs pass through unchanged
  if (imageUrl.includes('expirationTimestamp') && imageUrl.includes('signature')) {
    return imageUrl
  }

  if (imageCDNHost) {
    // Our proxy uses Cloudflare's global CDN to cache these image assets
    return `${imageCDNHost}/${encodeURIComponent(imageUrl)}`
  } else {
    return imageUrl
  }
}