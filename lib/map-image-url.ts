// lib/map-image-url.ts
import { Block, ExtendedRecordMap } from 'notion-types' 

// Define the path to your new API route
const PROXY_ENDPOINT = '/api/image-proxy'; 

// This function now just handles null/undefined or data URIs, 
// otherwise it constructs the proxy URL.
export const mapImageUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) {
    return null;
  }
  // Keep data URIs as they are
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  
  // For all other URLs (S3, file.notion.so, unsplash, etc.), 
  // create the URL for our proxy API route.
  try {
    // IMPORTANT: Encode the original URL to safely pass it as a query parameter
    return `${PROXY_ENDPOINT}?url=${encodeURIComponent(imageUrl)}`;
  } catch (err) {
    console.error('Error encoding URL for proxy:', imageUrl, err);
    return null; // Return null if encoding fails
  }
}

// This function is called by NotionRenderer. 
// It receives the URL NotionRenderer extracts (which might be S3 or file.notion.so).
// We now simply pass this URL to mapImageUrl to get the proxied version.
export const mapNotionImageUrl = (
    url: string, 
    block: Block, 
    recordMap: ExtendedRecordMap // Keep recordMap parameter even if unused for now
): string | null => {
  // Log what the renderer is *giving* us
  console.log(`>>> mapNotionImageUrl received: ${url}, Block ID: ${block.id}`); 

  // Let mapImageUrl handle null/data URIs and proxying everything else
  const proxiedUrl = mapImageUrl(url);

  if (proxiedUrl !== url && proxiedUrl !== null) {
      console.log(`>>> mapping ${url.substring(0, 100)}... to proxy: ${proxiedUrl.substring(0, 100)}...`);
  }

  return proxiedUrl;
}