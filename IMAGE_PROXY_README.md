# Image Proxy Implementation

This document explains the custom image proxy solution implemented to fix Notion image loading issues.

## Problem Summary

Images uploaded directly to Notion pages were not loading on the live website due to:
1. **CORS/ORB restrictions** - Browsers block direct access to private S3 URLs
2. **Signed URL expiration** - Notion's signed URLs are temporary and not available during ISR revalidation
3. **URL mismatch** - react-notion-x sometimes receives private S3 URLs instead of public file.notion.so URLs

## Solution Overview

The implemented solution consists of:

1. **Custom Image Proxy API** (`pages/api/image-proxy.ts`)
2. **Smart URL Mapping** (`lib/map-image-url.ts`)
3. **Security and Performance Features**

## Key Files Modified

### 1. `/pages/api/image-proxy.ts`
- **Purpose**: Server-side image proxy that fetches images and serves them to browsers
- **Security**: Domain allowlist prevents abuse
- **Performance**: Intelligent caching based on environment
- **Error Handling**: Comprehensive error handling with proper HTTP status codes

### 2. `/lib/map-image-url.ts`
- **Purpose**: Redirects all image URLs through the proxy
- **Smart URL Selection**: Prefers signed URLs when available, falls back to S3 URLs
- **Development Logging**: Detailed logging in development mode for debugging

### 3. `/components/NotionPage.tsx`
- **Purpose**: Ensures the image mapping function receives the recordMap context
- **Integration**: Passes the mapping function to NotionRenderer

## How It Works

1. **Image Request**: Browser requests an image from a Notion page
2. **URL Mapping**: `mapNotionImageUrl` converts the URL to a proxy URL
3. **Proxy Fetch**: The proxy API fetches the image server-side (bypassing CORS)
4. **Response**: The proxy serves the image data to the browser with appropriate headers

## Features

### Security
- **Domain Allowlist**: Only allows images from trusted domains
- **Request Validation**: Validates URL format and protocols
- **Size Limits**: Prevents abuse with file size limits (10MB max)
- **Method Restrictions**: Only allows GET requests

### Performance
- **Smart Caching**: 
  - Development: 5-minute cache for easy debugging
  - Production: 1-year cache for optimal performance
- **Efficient Headers**: Proper ETags and cache control headers
- **Timeout Handling**: 30-second timeout with proper error handling

### Debugging
- **Comprehensive Logging**: Detailed logs for troubleshooting
- **Error Tracking**: Specific error codes for different failure scenarios
- **Development Mode**: Extra logging in development environment

## Testing

### Local Testing
1. Run `npm run dev` to start the development server
2. Visit `/api/test-image-proxy` to see test results
3. Test specific images: `/api/image-proxy?url=https://file.notion.so/example-image.png`
4. Check browser Network tab for successful image loads
5. Check console logs for debugging information

### Production Testing
1. Deploy to Vercel
2. Check Vercel Function logs for any errors
3. Test with actual Notion images from your pages
4. Verify images load correctly in different browsers

## Troubleshooting

### Common Issues

1. **Images Still Not Loading**
   - Check browser Network tab for 403/404 errors
   - Verify the proxy URL is being generated correctly
   - Check Vercel Function logs for server-side errors

2. **Domain Not Allowed Errors**
   - Add new domains to the `ALLOWED_DOMAINS` array in `image-proxy.ts`
   - Redeploy after making changes

3. **Timeout Errors**
   - Check if source URLs are accessible
   - Consider increasing timeout for slow image sources
   - Verify network connectivity

### Debug Commands

```bash
# Check if dependencies are installed
npm ls next

# Test TypeScript compilation
npx tsc --noEmit

# Run linting
npm run test:lint

# Check for build errors
npm run build
```

## Deployment

1. **Push Changes**: Commit and push all changes to your repository
2. **Vercel Deployment**: Vercel will automatically redeploy
3. **Verify**: Check that images are loading correctly
4. **Monitor**: Check Vercel Function logs for any errors

## Maintenance

- **Monitor Function Usage**: Check Vercel dashboard for function invocations
- **Update Domain List**: Add new domains as needed
- **Performance Monitoring**: Monitor cache hit rates and response times
- **Security Updates**: Keep dependencies updated

## Next Steps

1. **Test with Real Images**: Test the proxy with actual Notion images
2. **Monitor Performance**: Check Vercel Function logs and performance metrics
3. **Optimize if Needed**: Adjust caching strategies based on usage patterns
4. **Consider CDN**: For high-traffic sites, consider adding a CDN layer

## Additional Resources

- [Vercel Functions Documentation](https://vercel.com/docs/concepts/functions)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Notion API Documentation](https://developers.notion.com/)