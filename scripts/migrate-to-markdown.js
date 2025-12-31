const { NotionAPI } = require('notion-client');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const notion = new NotionAPI();
const rootPageId = 'fc92efc512024561b080d5cff9a77dbe';

const contentDir = path.join(__dirname, '..', 'content');
const imagesDir = path.join(contentDir, 'images');
const articlesDir = path.join(contentDir, 'articles');
const pagesDir = path.join(contentDir, 'pages');

// Ensure directories exist
[contentDir, imagesDir, articlesDir, pagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Build Notion image proxy URL
function buildNotionImageUrl(url, blockId) {
  if (url.includes('s3-us-west-2.amazonaws.com') || url.includes('s3.us-west-2.amazonaws.com')) {
    const encoded = encodeURIComponent(url);
    return `https://pranavhari.notion.site/image/${encoded}?table=block&id=${blockId}&width=2000`;
  }
  // For other URLs like Unsplash, use directly
  return url;
}

// Download image function
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(imagesDir, filename);

    // Skip if already exists
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > 1000) {
        console.log(`  Skipping (exists): ${filename}`);
        resolve(filePath);
        return;
      }
    }

    const file = fs.createWriteStream(filePath);
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(filePath);
        downloadImage(response.headers.location, filename)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filePath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`  Downloaded: ${filename} (${fs.statSync(filePath).size} bytes)`);
        resolve(filePath);
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Extract text from rich text array
function extractText(richTextArray) {
  if (!richTextArray) return '';
  return richTextArray.map(item => {
    if (Array.isArray(item)) {
      let text = item[0] || '';
      // Handle formatting
      if (item[1]) {
        for (const format of item[1]) {
          if (format[0] === 'b') text = `**${text}**`;
          if (format[0] === 'i') text = `*${text}*`;
          if (format[0] === 'c') text = `\`${text}\``;
          if (format[0] === 'a') text = `[${text}](${format[1]})`;
        }
      }
      return text;
    }
    return item || '';
  }).join('');
}

// Get block children
function getBlockChildren(blockId, recordMap) {
  const block = recordMap.block[blockId]?.value;
  if (!block || !block.content) return [];
  return block.content;
}

// Convert blocks to Markdown recursively
function convertBlocksToMarkdown(blockIds, recordMap, imageMap, depth = 0) {
  let markdown = '';
  const indent = '  '.repeat(depth);

  for (const blockId of blockIds) {
    const blockData = recordMap.block[blockId];
    if (!blockData || !blockData.value) continue;

    const block = blockData.value;
    const text = extractText(block.properties?.title);
    const children = getBlockChildren(blockId, recordMap);

    switch (block.type) {
      case 'page':
        break;

      case 'text':
        if (text) markdown += `${text}\n\n`;
        break;

      case 'header':
        markdown += `# ${text}\n\n`;
        break;

      case 'sub_header':
        markdown += `## ${text}\n\n`;
        break;

      case 'sub_sub_header':
        markdown += `### ${text}\n\n`;
        break;

      case 'bulleted_list':
        markdown += `${indent}- ${text}\n`;
        if (children.length > 0) {
          markdown += convertBlocksToMarkdown(children, recordMap, imageMap, depth + 1);
        }
        break;

      case 'numbered_list':
        markdown += `${indent}1. ${text}\n`;
        if (children.length > 0) {
          markdown += convertBlocksToMarkdown(children, recordMap, imageMap, depth + 1);
        }
        break;

      case 'to_do':
        const checked = block.properties?.checked?.[0]?.[0] === 'Yes' ? 'x' : ' ';
        markdown += `- [${checked}] ${text}\n`;
        break;

      case 'toggle':
        markdown += `<details>\n<summary>${text}</summary>\n\n`;
        if (children.length > 0) {
          markdown += convertBlocksToMarkdown(children, recordMap, imageMap, depth);
        }
        markdown += `</details>\n\n`;
        break;

      case 'quote':
        markdown += `> ${text}\n\n`;
        break;

      case 'callout':
        const icon = block.format?.page_icon || '';
        markdown += `> ${icon} ${text}\n\n`;
        break;

      case 'code':
        const language = block.properties?.language?.[0]?.[0] || '';
        markdown += `\`\`\`${language}\n${text}\n\`\`\`\n\n`;
        break;

      case 'image':
        const imgFilename = imageMap[blockId];
        if (imgFilename) {
          const caption = block.properties?.caption ? extractText(block.properties.caption) : '';
          markdown += `![${caption}](./images/${imgFilename})\n`;
          if (caption) markdown += `*${caption}*\n`;
          markdown += '\n';
        }
        break;

      case 'divider':
        markdown += `---\n\n`;
        break;

      case 'bookmark':
        const bookmarkUrl = block.properties?.link?.[0]?.[0] || '';
        const bookmarkTitle = block.properties?.title?.[0]?.[0] || bookmarkUrl;
        const bookmarkDesc = block.properties?.description?.[0]?.[0] || '';
        markdown += `[${bookmarkTitle}](${bookmarkUrl})`;
        if (bookmarkDesc) markdown += ` - ${bookmarkDesc}`;
        markdown += '\n\n';
        break;

      case 'embed':
      case 'video':
      case 'audio':
        const embedUrl = block.format?.display_source || block.properties?.source?.[0]?.[0];
        if (embedUrl) {
          markdown += `[Embedded content](${embedUrl})\n\n`;
        }
        break;

      case 'table':
        // Handle table
        if (children.length > 0) {
          markdown += '\n';
          let headerRow = true;
          for (const rowId of children) {
            const rowBlock = recordMap.block[rowId]?.value;
            if (rowBlock && rowBlock.type === 'table_row') {
              const cells = rowBlock.properties?.cells || [];
              const rowText = cells.map(cell => extractText(cell)).join(' | ');
              markdown += `| ${rowText} |\n`;
              if (headerRow) {
                markdown += `| ${cells.map(() => '---').join(' | ')} |\n`;
                headerRow = false;
              }
            }
          }
          markdown += '\n';
        }
        break;

      case 'column_list':
        if (children.length > 0) {
          markdown += convertBlocksToMarkdown(children, recordMap, imageMap, depth);
        }
        break;

      case 'column':
        if (children.length > 0) {
          markdown += convertBlocksToMarkdown(children, recordMap, imageMap, depth);
        }
        break;

      case 'collection_view':
      case 'collection_view_page':
        markdown += `<!-- Database/Collection -->\n\n`;
        break;

      default:
        if (text) {
          markdown += `${text}\n\n`;
        }
        if (children.length > 0) {
          markdown += convertBlocksToMarkdown(children, recordMap, imageMap, depth);
        }
    }
  }

  return markdown;
}

// Get all images from recordMap
function getAllImages(recordMap) {
  const images = [];

  for (const blockId of Object.keys(recordMap.block)) {
    const block = recordMap.block[blockId]?.value;
    if (!block) continue;

    if (block.format?.page_cover) {
      images.push({
        url: block.format.page_cover,
        type: 'cover',
        blockId
      });
    }

    if (block.format?.page_icon && block.format.page_icon.startsWith('http')) {
      images.push({
        url: block.format.page_icon,
        type: 'icon',
        blockId
      });
    }

    if (block.type === 'image') {
      const source = block.properties?.source?.[0]?.[0];
      if (source) {
        images.push({
          url: source,
          type: 'image',
          blockId
        });
      }
    }
  }

  return images;
}

// Generate filename from URL
function getFilenameFromUrl(url, blockId, type) {
  try {
    const urlObj = new URL(url);
    let filename = path.basename(urlObj.pathname);

    // Clean up filename
    filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Add type prefix and block ID for uniqueness
    const shortId = blockId.replace(/-/g, '').substring(0, 8);

    if (type === 'cover') {
      filename = `cover_${shortId}_${filename}`;
    } else if (type === 'icon') {
      filename = `profile_${shortId}_${filename}`;
    } else {
      filename = `img_${shortId}_${filename}`;
    }

    // Ensure extension
    if (!filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      filename += '.jpg';
    }

    return filename;
  } catch (e) {
    return `image_${blockId.replace(/-/g, '').substring(0, 8)}.jpg`;
  }
}

// Process a single page
async function processPage(pageId, recordMap, isMainPage = false) {
  const pageBlock = recordMap.block[pageId]?.value;
  if (!pageBlock) return null;

  const title = extractText(pageBlock.properties?.title) || 'Untitled';
  const cover = pageBlock.format?.page_cover;
  const icon = pageBlock.format?.page_icon;
  const children = getBlockChildren(pageId, recordMap);

  console.log(`\nProcessing: ${title}`);

  // Collect images for this page
  const pageImages = [];
  const imageMap = {};

  // Add cover and icon
  if (cover) {
    const filename = getFilenameFromUrl(cover, pageId, 'cover');
    pageImages.push({ url: cover, filename, blockId: pageId, type: 'cover' });
  }

  if (icon && icon.startsWith('http')) {
    const filename = getFilenameFromUrl(icon, pageId, 'icon');
    pageImages.push({ url: icon, filename, blockId: pageId, type: 'icon' });
  }

  // Find all image blocks in children
  const findImages = (blockIds) => {
    for (const blockId of blockIds) {
      const block = recordMap.block[blockId]?.value;
      if (!block) continue;

      if (block.type === 'image') {
        const source = block.properties?.source?.[0]?.[0];
        if (source) {
          const filename = getFilenameFromUrl(source, blockId, 'image');
          pageImages.push({ url: source, filename, blockId, type: 'image' });
          imageMap[blockId] = filename;
        }
      }

      const childIds = getBlockChildren(blockId, recordMap);
      if (childIds.length > 0) {
        findImages(childIds);
      }
    }
  };

  findImages(children);

  // Download images
  console.log(`  Found ${pageImages.length} images`);
  for (const img of pageImages) {
    try {
      const downloadUrl = buildNotionImageUrl(img.url, img.blockId);
      await downloadImage(downloadUrl, img.filename);
    } catch (err) {
      console.log(`  Failed to download ${img.filename}: ${err.message}`);
    }
  }

  // Generate markdown
  let markdown = '';

  if (isMainPage) {
    // Main page has special formatting
    const coverImg = pageImages.find(i => i.type === 'cover');
    const iconImg = pageImages.find(i => i.type === 'icon');

    markdown += `# ${title}\n\n`;
    if (coverImg) markdown += `![Cover](./images/${coverImg.filename})\n\n`;
    if (iconImg) markdown += `![Profile](./images/${iconImg.filename})\n\n`;
  } else {
    markdown += `# ${title}\n\n`;
    const coverImg = pageImages.find(i => i.type === 'cover');
    if (coverImg) markdown += `![Cover](../images/${coverImg.filename})\n\n`;
  }

  markdown += convertBlocksToMarkdown(children, recordMap, imageMap);

  return {
    title,
    markdown,
    images: pageImages
  };
}

async function main() {
  console.log('=== NOTION TO MARKDOWN MIGRATION ===\n');
  console.log('Fetching Notion page data...');

  try {
    const recordMap = await notion.getPage(rootPageId);
    console.log(`Fetched ${Object.keys(recordMap.block).length} blocks`);

    // Find all subpages
    const subpages = [];
    for (const blockId of Object.keys(recordMap.block)) {
      const block = recordMap.block[blockId]?.value;
      if (block && block.type === 'page' && blockId !== rootPageId) {
        subpages.push({
          id: blockId,
          title: extractText(block.properties?.title)
        });
      }
    }

    console.log(`Found ${subpages.length} subpages`);

    // Process main page
    console.log('\n--- MAIN PAGE ---');
    const mainPageResult = await processPage(rootPageId, recordMap, true);

    if (mainPageResult) {
      const mainPath = path.join(contentDir, 'index.md');
      fs.writeFileSync(mainPath, mainPageResult.markdown);
      console.log(`  Saved: index.md`);
    }

    // Process subpages
    console.log('\n--- SUBPAGES ---');
    for (const subpage of subpages) {
      try {
        // Fetch full subpage content
        console.log(`\nFetching full content for: ${subpage.title}`);
        const subRecordMap = await notion.getPage(subpage.id);

        const result = await processPage(subpage.id, subRecordMap, false);

        if (result) {
          // Determine output directory
          const isSightings = subpage.title.toLowerCase().includes('sighting');
          const outputDir = isSightings ? pagesDir : articlesDir;

          // Create filename from title
          const filename = subpage.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50) + '.md';

          const filePath = path.join(outputDir, filename);

          // Adjust image paths for articles/pages
          let adjustedMarkdown = result.markdown.replace(/\.\/images\//g, '../images/');

          fs.writeFileSync(filePath, adjustedMarkdown);
          console.log(`  Saved: ${isSightings ? 'pages' : 'articles'}/${filename}`);
        }
      } catch (err) {
        console.log(`  Error processing ${subpage.title}: ${err.message}`);
      }
    }

    console.log('\n=== MIGRATION COMPLETE ===');
    console.log(`Output directory: ${contentDir}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
