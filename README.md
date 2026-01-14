# Visual Regression Testing Action

A GitHub composite action that automates visual regression testing by comparing multi-dev environments against production sites.

## Features

- 📸 Automated screenshot capture with Playwright
- 🔍 Pixel-perfect comparison using pixelmatch
- 💬 Automatic PR comments with test results
- 📊 Detailed HTML reports with side-by-side comparisons
- 🎯 Independent execution per repository
- 🏷️ Semantic versioning support

## Usage

### In Your Site Repository

Create `.github/workflows/visual-regression.yml`:

```yaml
name: Visual Regression Testing

on:
  workflow_run:
    workflows: ["Deploy to Pantheon"]
    types: [completed]

jobs:
  visual-regression:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Get PR info
        id: pr
        uses: actions/github-script@v7
        with:
          script: |
            const pr = context.payload.workflow_run.pull_requests[0];
            const branch = context.payload.workflow_run.head_branch;
            const safeEnv = branch.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 11);
            
            core.setOutput('number', pr?.number || '');
            core.setOutput('multidev', safeEnv);
      
      - name: Run visual regression tests
        uses: your-org/visual-regression-action@v1
        with:
          live-url: 'https://zerowastesv.org'
          multidev-url: 'https://${{ steps.pr.outputs.multidev }}-covive-site.pantheonsite.io'
          project-name: 'covive'
          urls-file: './regression-testing/urls.json'
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Create `regression-testing/urls.json`

```json
[
  {
    "name": "Homepage",
    "url": "https://zerowastesv.org"
  },
  {
    "name": "About Page",
    "url": "https://zerowastesv.org/about"
  }
]
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `live-url` | Yes | - | Production site URL (baseline) |
| `multidev-url` | Yes | - | Multi-dev environment URL to test |
| `project-name` | Yes | - | Project identifier (e.g., covive) |
| `urls-file` | No | `./regression-testing/urls.json` | Path to URLs configuration |
| `github-token` | Yes | - | GitHub token for PR comments |
| `diff-threshold` | No | `0.1` | Pixelmatch threshold (0-1) |

## Outputs

| Output | Description |
|--------|-------------|
| `summary-json` | Path to generated summary.json |
| `artifact-name` | Name of uploaded artifact |

## What It Does

1. **Captures LIVE site** - Takes screenshots as baseline
2. **Captures Multi-dev** - Takes screenshots from PR environment
3. **Compares** - Finds visual differences using pixelmatch
4. **Reports** - Generates HTML report + summary.json
5. **Comments** - Posts results to GitHub PR
6. **Uploads** - Saves all screenshots as artifacts

## Example PR Comment

```markdown
## 📸 Visual Regression Test Results - covive

**Environment:** https://pr123-covive-site.pantheonsite.io
**Baseline:** https://zerowastesv.org

### 📊 Summary
| Status | Count |
|--------|-------|
| ✅ Passed | 37 |
| ⚠️ Changed | 3 |
| ❌ Failed | 0 |

### ⚠️ Visual Changes Detected
- Homepage (2.34% difference)
- About Page (1.12% difference)

[Download Full Report →](link-to-artifacts)
```

## Versioning

We use semantic versioning:

- `@v1` - Latest v1.x.x version (auto-updates)
- `@v1.0.0` - Pin to specific version (stable)
- `@main` - Latest commit (unstable)

## Development

### Local Testing

```bash
# Install dependencies
npm install

# Run tests locally
export LIVE_URL=https://zerowastesv.org
export MULTIDEV_URL=https://dev-covive.pantheonsite.io
export PROJECT=covive
export URLS_PATH=./test-urls.json

node scripts/capture.mjs
node scripts/diff.mjs
node scripts/report.mjs
```

### Updating the Action

1. Make changes to scripts
2. Test thoroughly
3. Commit and push
4. Tag new version:
   ```bash
   git tag v1.1.0
   git push --tags
   ```
5. Update major version tag:
   ```bash
   git tag -fa v1 -m "Update v1 to v1.1.0"
   git push origin v1 --force
   ```

## License

MIT

## Support

Open an issue in this repository for bugs or feature requests.
