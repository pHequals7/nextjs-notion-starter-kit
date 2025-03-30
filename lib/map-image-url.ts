import { Block, ExtendedRecordMap } from 'notion-types'
import { imageCDNHost } from './config'

export const mapNotionImageUrl = (url: string, block: Block, recordMap: ExtendedRecordMap) => {
  console.log(`>>> mapNotionImageUrl called with URL: ${url}, Block ID: ${block.id}`); 
  
  if (!url) {
    return null
  }

  if (url.startsWith('data:')) {
    return url
  }
  
  // Check if the URL passed is an S3/secure.notion-static URL
  const isNotionSecureUrl = url.includes('.amazonaws.com/') || url.includes('secure.notion-static.com');

  if (isNotionSecureUrl) {
    // It's the wrong URL! Try to find the correct signed URL from the recordMap.
    const signedUrl = recordMap?.signed_urls?.[block.id];
    if (signedUrl) {
      console.log(`>>> Corrected S3 URL ${url} to signed URL: ${signedUrl}`);
      // Use the correct signed URL
      return mapImageUrl(signedUrl); 
    } else {
      // Signed URL not found for this block ID, maybe it's an icon/cover?
      // Or an image type that doesn't get a signed URL?
      // Log a warning and fall back to trying to use the original S3 URL (might still fail)
      // OR potentially try the Notion proxy as a last resort? Let's try passing through first.
      console.warn(`>>> Could not find signed URL for block ${block.id}, using original: ${url}`);
      return mapImageUrl(url); // This will likely still fail in the browser
    }
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