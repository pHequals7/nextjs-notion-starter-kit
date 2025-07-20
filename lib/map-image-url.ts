// lib/map-image-url.ts
import { Block, ExtendedRecordMap } from 'notion-types' 

// Define the path to your API route
const PROXY_ENDPOINT = '/api/image-proxy'; 

/**
 * Handles mapping the final URL. For most URLs, it points them to our enhanced proxy.
 * It passes through data URIs and external URLs that don't need proxying.
 */
export const mapImageUrl = (imageUrl: string | null | undefined, useEnhanced: boolean = true): string | null => {
  if (!imageUrl) {
    return null;
  }
  
  // Data URIs are passed through directly
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  
  // For external URLs (not Notion), we can try to pass them through
  // if they're from trusted domains that don't need proxying
  if (imageUrl.startsWith('https://images.unsplash.com/')) {
    return imageUrl; // Unsplash images should work directly
  }
  
  // Smart URL handling: bypass proxy for URLs that work directly
  if (imageUrl.startsWith('https://file.notion.so/')) {
    return imageUrl; // These usually work directly with valid signatures
  }
  
  if (imageUrl.startsWith('https://img.notionusercontent.com/')) {
    return imageUrl; // Modern Notion URLs with valid signatures work directly
  }
  
  // Check if this is a problematic image that needs proxy handling
  const isProblematicNotionImage = imageUrl.includes('secure.notion-static.com') || 
                                   imageUrl.includes('prod-files-secure');
  
  // Only proxy problematic URLs (old S3 URLs that are likely expired)
  if (isProblematicNotionImage) {
    try {
      const endpoint = PROXY_ENDPOINT;
      return `${endpoint}?url=${encodeURIComponent(imageUrl)}`;
    } catch (err) {
      console.error('[mapImageUrl] Error encoding URL for proxy:', imageUrl, err);
      return null;
    }
  }
  
  // For other URLs, try direct access first
  return imageUrl;
}

/**
 * This function is called by NotionRenderer for each image URL it finds.
 * It receives the URL that NotionRenderer *thinks* is the correct one 
 * (which we know is sometimes the wrong S3 URL).
 * We implement smart URL selection and proxy all external images.
 */
export const mapNotionImageUrl = (
    url: string, // This is the URL from react-notion-x (often the S3 URL)
    block: Block, 
    recordMap: ExtendedRecordMap
): string | null => {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!url) {
    console.warn('[mapNotionImageUrl] No URL provided');
    return null;
  }

  let targetUrl = url; // Default to the URL provided by react-notion-x
  const pageIconUrl = block?.format?.page_icon; // Get the canonical page icon URL from block properties

  // Check if the URL being processed is the page icon
  const isPageIcon = pageIconUrl && url === pageIconUrl;

  // Check if there's a signed URL available specifically for this block ID
  const signedUrlForBlock = recordMap?.signed_urls?.[block.id];

  // Enhanced URL selection logic
  if (isPageIcon) {
    // Handle Page Icon specifically:
    // Proxy the original icon URL. It might fail (403), but avoids using the cover image URL.
    // react-notion-x might fall back to defaultPageIcon if this fails.
    if (isDev) {
      console.log(`[mapNotionImageUrl] Handling page icon. Block ${block.id}, URL: ${url?.substring(0, 100)}...`);
    }
    targetUrl = url; // Use the original icon URL passed in
  } else if (signedUrlForBlock) {
    // Handle other images (like cover). Prefer the signed URL if available for this block.
    if (isDev) {
      console.log(`[mapNotionImageUrl] Found signed URL for block ${block.id}: ${signedUrlForBlock?.substring(0, 100)}...`);
    }
    targetUrl = signedUrlForBlock; // Use the signed URL for this block
  } else {
    // No specific signed URL for this block ID found, and it's not the page icon.
    // Look for alternative signed URLs that might work for this image
    const allSignedUrls = recordMap?.signed_urls || {};
    const urlsArray = Object.values(allSignedUrls);
    
    // Try to find a signed URL that matches the image filename or path
    const potentialMatch = urlsArray.find(signedUrl => {
      if (typeof signedUrl === 'string' && url.includes('/')) {
        const urlFilename = url.split('/').pop()?.split('?')[0];
        const signedFilename = signedUrl.split('/').pop()?.split('?')[0];
        return urlFilename && signedFilename && urlFilename === signedFilename;
      }
      return false;
    });

    if (potentialMatch) {
      if (isDev) {
        console.log(`[mapNotionImageUrl] Found potential signed URL match for block ${block.id}: ${potentialMatch.substring(0, 100)}...`);
      }
      targetUrl = potentialMatch;
    } else {
      // No signed URL found, use the original URL (likely S3, might fail)
      if (isDev) {
        console.log(`[mapNotionImageUrl] No signed URL found for block ${block.id}, using original URL: ${url?.substring(0, 100)}...`);
      }
      targetUrl = url;
    }
  }

  // Let mapImageUrl handle the logic of proxying the targetUrl
  // Use enhanced proxy for Notion images, especially problematic ones
  const finalUrl = mapImageUrl(targetUrl, true);

  // Log the result in development
  if (isDev) {
    if (finalUrl !== url && finalUrl !== null) {
      console.log(`[mapNotionImageUrl] Mapping ${url?.substring(0, 100)}... to proxy: ${finalUrl?.substring(0, 100)}...`);
    } else if (finalUrl === url) {
      console.log(`[mapNotionImageUrl] URL passed through (likely data URI): ${url?.substring(0,100)}...`);
    } else {
      console.log(`[mapNotionImageUrl] Mapping resulted in null for URL: ${url}`);
    }
  }

  return finalUrl;
}