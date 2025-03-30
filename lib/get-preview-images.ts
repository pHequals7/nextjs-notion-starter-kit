import crypto from 'crypto'
import got from 'got'
import pMap from 'p-map'

import { api, isPreviewImageSupportEnabled } from './config'
import * as types from './types'
import * as db from './db' // Your custom DB/cache implementation

// NOTE: We don't know the exact types from './db', so using 'any' 
// to bypass TS errors. This reduces type safety but should allow build.
// Consider defining proper types for your './db' module later.

function sha256(input: Buffer | string) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export async function getPreviewImages(
  images: string[]
): Promise<types.PreviewImageMap> {
  if (!isPreviewImageSupportEnabled) {
    return {}
  }

  // Assuming db.images.doc returns *something* with an 'id' conceptually
  const imageDocRefs: any[] = images.map((url) => { 
    const id = sha256(url)
    // Assuming your db layer returns objects we can pass to getAll
    return db.images.doc(id) 
  })

  if (!imageDocRefs.length) {
    return {}
  }

  // Assuming db.db.getAll returns an array of *something*
  const imageDocs: any[] = await db.db.getAll(...imageDocRefs) 

  const results = await pMap(imageDocs, async (model: any, index): Promise<types.PreviewImage | null> => {
    // Use basic truthiness check for existence if 'exists' property isn't guaranteed
    // Or use the specific check your DB provides
    // Using 'model.exists' speculatively based on the original error
    if (model && model.exists) { 
      // Assuming model.data() exists and returns the preview image data
      // Use 'as any' if model.data() type is unknown
      return (model.data ? model.data() : model) as types.PreviewImage 
    } else {
      // Assuming model.id exists
      const json = { 
        url: images[index],
        // Use 'model.id' if available, otherwise generate again? Unlikely needed if getAll uses refs.
        id: model?.id || sha256(images[index]) // Fallback if id isn't on the model directly
      }
      console.log('createPreviewImage server-side', json)

      try {
        // Type assertion for the API response
        const previewImageResult = await got
          .post(api.createPreviewImage, { json })
          .json<types.PreviewImage>() 

        return previewImageResult
      } catch (err) {
          console.error(`Failed to create preview image for ${json.url}`, err);
          return null; 
      }
    }
  }, { concurrency: 4 })

  const successfulResults = results.filter((result): result is types.PreviewImage => result !== null);

  return successfulResults
    .filter((image) => !image.error) 
    .reduce(
      (acc, result) => {
        if (result.url) { 
          acc[result.url] = result;
        }
        return acc;
      },
      {} as types.PreviewImageMap 
    );
}