// lib/map-image-url.ts
import { Block, ExtendedRecordMap } from 'notion-types' 

// Define the path to your API route
const PROXY_ENDPOINT = '/api/image-proxy'; 

/**
 * Handles mapping the final URL. For most URLs, it points them to our proxy.
 * It passes through data URIs untouched.
 */
export const mapImageUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) {
    return null;
  }
  // Data URIs are passed through directly
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  
  // Proxy everything else
  try {
    // Crucially, encode the original URL before adding it as a query parameter
    return `${PROXY_ENDPOINT}?url=${encodeURIComponent(imageUrl)}`;
  } catch (err) {
    console.error('[mapImageUrl] Error encoding URL for proxy:', imageUrl, err);
    return null; // Return null if encoding fails
  }
}

/**
 * This function is called by NotionRenderer for each image URL it finds.
 * It receives the URL that NotionRenderer *thinks* is the correct one 
 * (which we know is sometimes the wrong S3 URL).
 * We simply take whatever URL we are given and pass it to mapImageUrl 
 * to get our reliable proxy URL.
 */
export const mapNotionImageUrl = (
    url: string, // This is the secure.notion-static.com URL from react-notion-x
    block: Block, 
    recordMap: ExtendedRecordMap
): string | null => {
  let targetUrl = url; // Default to the URL provided by react-notion-x
  const pageIconUrl = block?.format?.page_icon; // Get the canonical page icon URL from block properties

  // Check if the URL being processed is the page icon
  const isPageIcon = pageIconUrl && url === pageIconUrl;

  // Check if there's a signed URL available specifically for this block ID
  const signedUrlForBlock = recordMap?.signed_urls?.[block.id];

  if (isPageIcon) {
    // Handle Page Icon specifically:
    // Proxy the original icon URL. It might fail (403), but avoids using the cover image URL.
    // react-notion-x might fall back to defaultPageIcon if this fails.
    console.log(`>>> Handling page icon. Attempting to proxy original icon URL: ${url.substring(0, 100)}...`);
    targetUrl = url; // Use the original icon URL passed in
  } else if (signedUrlForBlock) {
    // Handle other images (like cover). Prefer the signed URL if available for this block.
    console.log(`>>> Found signed URL for block ${block.id}: ${signedUrlForBlock.substring(0, 100)}...`);
    targetUrl = signedUrlForBlock; // Use the signed URL for this block
  } else {
    // No specific signed URL for this block ID found, and it's not the page icon.
    // Proxy the original URL provided (likely S3, might fail).
    console.log(`>>> No signed URL found for block ${block.id}, using original URL: ${url.substring(0, 100)}...`);
    targetUrl = url; // Use the original URL passed in
  }

  // Log which URL we are actually going to proxy
  console.log(`>>> mapNotionImageUrl final target URL for proxy: ${targetUrl.substring(0, 100)}...`); 

  // Let mapImageUrl handle the logic of proxying the targetUrl
  const finalUrl = mapImageUrl(targetUrl);

  // Log the result if it was changed
  if (finalUrl !== url && finalUrl !== null) {
      // Log shortened URLs for clarity
      const originalShort = url?.substring(0, 100);
      const finalShort = finalUrl?.substring(0, 100);
      console.log(`>>> mapping ${originalShort}... to proxy: ${finalShort}...`);
  } else if (finalUrl === url) {
       console.log(`>>> URL ${url?.substring(0,100)}... passed through (likely data URI)`);
  } else {
       console.log(`>>> mapping resulted in null for URL: ${url}`);
  }

  return finalUrl;
}