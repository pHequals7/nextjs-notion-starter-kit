import { Block } from 'notion-types'
import { imageCDNHost } from './config'

export const mapNotionImageUrl = (url: string, block: Block) => {
  if (!url) {
    return null
  }

  if (url.startsWith('data:')) {
    return url
  }
  
  // Handle signed URLs from Notion (file.notion.so)
  if (url.startsWith('https://file.notion.so')) {
    return url
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

  return mapImageUrl(notionImageUrlV2.toString())
}

export const mapImageUrl = (imageUrl: string) => {
  if (!imageUrl) {
    return null
  }
  
  if (imageUrl.startsWith('data:')) {
    return imageUrl
  }

  // Pass through Notion's signed URLs
  if (imageUrl.startsWith('https://file.notion.so')) {
    return imageUrl
  }

  if (imageCDNHost) {
    return `${imageCDNHost}/${encodeURIComponent(imageUrl)}`
  } else {
    return imageUrl
  }
}