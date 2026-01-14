// scripts/upload-images.mjs
// Uploads diff images to GitHub so they can be embedded in PR comments

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID;
const PR_NUMBER = process.env.PR_NUMBER;

// Upload a single image to GitHub (as a gist or issue comment attachment)
async function uploadImageToGitHub(imagePath, imageName) {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Create a gist with the image
    const gistData = {
        description: `Visual regression diff: ${imageName} (PR #${PR_NUMBER})`,
        public: false,
        files: {
            [imageName]: {
                content: base64Image
            }
        }
    };

    const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(gistData)
    });

    if (!response.ok) {
        throw new Error(`Failed to create gist: ${response.statusText}`);
    }

    const gist = await response.json();
    return gist.files[imageName].raw_url;
}

// Find all diff images and upload them
async function uploadAllDiffs() {
    const diffsDir = path.join(__dirname, '..', 'artifacts', 'diffs');
    const imageUrls = {};

    if (!fs.existsSync(diffsDir)) {
        console.log('⚠️  No diffs directory found');
        return imageUrls;
    }

    const files = fs.readdirSync(diffsDir).filter(f => f.endsWith('.png'));

    console.log(`📤 Uploading ${files.length} diff images...`);

    for (const file of files) {
        const imagePath = path.join(diffsDir, file);
        const slug = path.basename(file, '.png');

        try {
            const url = await uploadImageToGitHub(imagePath, file);
            imageUrls[slug] = url;
            console.log(`  ✅ ${file} → ${url}`);
        } catch (error) {
            console.error(`  ❌ Failed to upload ${file}:`, error.message);
        }
    }

    // Save URLs to a JSON file for the comment script to use
    const urlsPath = path.join(__dirname, '..', 'artifacts', 'image-urls.json');
    fs.writeFileSync(urlsPath, JSON.stringify(imageUrls, null, 2));

    console.log(`✅ Saved image URLs to ${urlsPath}`);
    return imageUrls;
}

// Main
uploadAllDiffs().catch(error => {
    console.error('❌ Failed:', error);
    process.exit(1);
});
