// scripts/post-pr-comment.mjs
// Custom script to post visual regression results to GitHub PR
// Alternative to using Argos CI for a fully self-hosted solution

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub API details from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY; // owner/repo
const PR_NUMBER = process.env.PR_NUMBER;
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID;
const MULTIDEV_URL = process.env.MULTIDEV_URL || 'https://multidev.pantheonsite.io';
const LIVE_URL = process.env.LIVE_URL || 'https://example.com';
const PROJECT = process.env.PROJECT || 'project';

if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !PR_NUMBER) {
    console.error('❌ Missing required environment variables:');
    console.error('   GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER');
    process.exit(1);
}

// ---------- Read test results ----------
function readResults() {
    const reportPath = path.join(__dirname, '..', 'artifacts', 'report', 'summary.json');

    // Default summary if file doesn't exist
    const defaultSummary = {
        total: 0,
        passed: 0,
        changed: 0,
        failed: 0,
        urls: []
    };

    try {
        if (fs.existsSync(reportPath)) {
            return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        }
    } catch (error) {
        console.warn(`⚠️  Could not read summary.json: ${error.message}`);
    }

    return defaultSummary;
}

// ---------- Generate markdown comment ----------
function generateComment(summary) {
    const { total, passed, changed, failed, urls = [] } = summary;

    const emoji = failed > 0 ? '❌' : changed > 0 ? '⚠️' : '✅';
    const status = failed > 0 ? 'Failed' : changed > 0 ? 'Changes Detected' : 'All Passed';

    let comment = `## ${emoji} Visual Regression Test: ${status} (${PROJECT.toUpperCase()})

**Environment:** [${MULTIDEV_URL}](${MULTIDEV_URL})  
**Baseline:** [${LIVE_URL}](${LIVE_URL})

### 📊 Summary
| Status | Count |
|--------|-------|
| ✅ Passed (No changes) | ${passed} |
| ⚠️  Changed (Visual differences) | ${changed} |
| ❌ Failed (Broken) | ${failed} |
| **Total URLs Tested** | **${total}** |

`;

    // Add detailed results if available
    if (urls.length > 0) {
        comment += `\n### 📸 Detailed Results\n\n`;

        // Group by status
        const changedUrls = urls.filter(u => u.status === 'changed');
        const failedUrls = urls.filter(u => u.status === 'failed');
        const passedUrls = urls.filter(u => u.status === 'passed');

        if (failedUrls.length > 0) {
            comment += `#### ❌ Failed (${failedUrls.length})\n`;
            failedUrls.forEach(url => {
                comment += `- **${url.name}** - [View URL](${url.url})\n`;
                if (url.error) {
                    comment += `  \`\`\`\n  ${url.error}\n  \`\`\`\n`;
                }
            });
            comment += `\n`;
        }

        if (changedUrls.length > 0) {
            comment += `#### ⚠️ Visual Changes Detected (${changedUrls.length})\n`;
            changedUrls.forEach(url => {
                const diffPercent = url.diffPercent ? `${url.diffPercent.toFixed(2)}%` : 'N/A';
                comment += `- **${url.name}** (${diffPercent} difference) - [View URL](${url.url})\n`;
            });
            comment += `\n`;
        }

        if (passedUrls.length > 0 && passedUrls.length <= 10) {
            comment += `<details>\n<summary>✅ Passed (${passedUrls.length})</summary>\n\n`;
            passedUrls.forEach(url => {
                comment += `- ${url.name}\n`;
            });
            comment += `\n</details>\n\n`;
        }
    }

    // Add links to artifacts
    comment += `### 🔗 Resources
- 📦 [Download Full Report & Screenshots](https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID})
- 🖥️ [Preview Multidev Site](${MULTIDEV_URL})
- 🌐 [Compare with LIVE Site](${LIVE_URL})

---
*Automated visual regression testing • Run ID: ${GITHUB_RUN_ID}*
`;

    return comment;
}

// ---------- Post comment to GitHub ----------
async function postComment(body) {
    const [owner, repo] = GITHUB_REPOSITORY.split('/');
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${PR_NUMBER}/comments`;

    console.log(`📤 Posting comment to PR #${PR_NUMBER}...`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Visual-Regression-Bot'
        },
        body: JSON.stringify({ body })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log(`✅ Comment posted successfully: ${data.html_url}`);
    return data;
}

// ---------- Main ----------
async function main() {
    try {
        console.log(`🚀 Generating visual regression report for ${PROJECT}...`);

        const summary = readResults();
        const comment = generateComment(summary);

        await postComment(comment);

        console.log('✅ Done!');
    } catch (error) {
        console.error(`❌ Failed to post comment: ${error.message}`);
        process.exit(1);
    }
}

main();
