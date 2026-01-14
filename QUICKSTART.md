# 🚀 Quick Start - Composite Action Setup

## What I Just Built For You

I've created a **complete composite action** at `/Work/covive/visual-regression-action/`:

```
visual-regression-action/
├── action.yml              # Composite action definition
├── package.json            # Dependencies
├── README.md               # Full documentation
└──scripts /
    ├── capture.mjs         # Screenshot capture (with BASE_URL)
    ├── diff.mjs            # Visual comparison
    ├── report.mjs          # Generate reports
    ├── post-pr-comment.mjs # Post to GitHub
    └── utils.mjs           # Utilities
```

---

## 📋 Step-by-Step Setup (15 minutes total)

### Step 1: Publish the Action to GitHub (5 min)

```bash
cd /Users/gustavorodiguezsalas/Work/covive/visual-regression-action

# Create new GitHub repo (do this on GitHub.com first)
# Name it: visual-regression-action
# Make it public or private

# Initialize git
git init
git add .
git commit -m "Initial release of visual regression action"

# Add remote (replace with your org/username)
git remote add origin git@github.com:YOUR-ORG/visual-regression-action.git

# Push and tag
git push -u origin main
git tag v1.0.0
git tag v1
git push --tags
```

### Step 2: Add to Each Site Repo (2 min per site)

For **EACH** of your 9 repos (covive, pba, abag, etc.), add this workflow:

#### covive Site Example

```bash
cd /Users/gustavorodiguezsalas/Work/covive

# Create workflow file
mkdir -p .github/workflows

cat > .github/workflows/visual-regression.yml << 'EOF'
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
      - uses: actions/checkout@v4
      
      - name: Get PR details
        id: pr
        uses: actions/github-script@v7
        with:
          script: |
            const pr = context.payload.workflow_run.pull_requests[0];
            const branch = context.payload.workflow_run.head_branch;
            const safeEnv = branch.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 11);
            core.setOutput('number', pr?.number || '');
            core.setOutput('multidev', safeEnv);
      
      - name: Run visual regression
        uses: YOUR-ORG/visual-regression-action@v1
        with:
          live-url: 'https://zerowastesv.org'
          multidev-url: 'https://${{ steps.pr.outputs.multidev }}-covive-site.pantheonsite.io'
          project-name: 'covive'
          urls-file: './regression-testing/urls.json'
          github-token: ${{ secrets.GITHUB_TOKEN }}
EOF

# Commit and push
git add .github/workflows/visual-regression.yml
git commit -m "Add visual regression testing workflow"
git push
```

---

## 📁 Per-Site Configuration

Each site just needs a `urls.json` file:

### covive: `regression-testing/urls.json`
```json
[
  {
    "name": "Homepage",
    "url": "https://zerowastesv.org"
  },
  {
    "name": "About",
    "url": "https://zerowastesv.org/about"
  }
]
```

### PBA: `regression-testing/urls.json`
```json
[
  {
    "name": "Homepage",
    "url": "https://planbayarea.org"
  },
  {
    "name": "2050 Plan",
    "url": "https://planbayarea.org/2050-plan"
  }
]
```

### ABAG: `regression-testing/urls.json`
```json
[
  {
    "name": "Homepage",
    "url": "https://abag.ca.gov"
  }
]
```

*(Repeat for all 9 sites)*

---

## 🎯 Workflow Templates for Each Site

### Template (Copy & Modify)

```yaml
- uses: YOUR-ORG/visual-regression-action@v1
  with:
    live-url: 'CHANGE_ME'                    # Production URL
    multidev-url: 'CHANGE_ME-${{ steps.pr.outputs.multidev }}.pantheonsite.io'
    project-name: 'CHANGE_ME'                # Project shortname
    urls-file: './regression-testing/urls.json'
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### covive
```yaml
live-url: 'https://zerowastesv.org'
multidev-url: 'https://${{ steps.pr.outputs.multidev }}-covive-site.pantheonsite.io'
project-name: 'covive'
```

### PBA
```yaml
live-url: 'https://planbayarea.org'
multidev-url: 'https://${{ steps.pr.outputs.multidev }}-pba-site.pantheonsite.io'
project-name: 'pba'
```

### ABAG
```yaml
live-url: 'https://abag.ca.gov'
multidev-url: 'https://${{ steps.pr.outputs.multidev }}-abag-site.pantheonsite.io'
project-name: 'abag'
```

### Bamblog
```yaml
live-url: 'https://bamblog-DOMAIN.com'     # Replace with actual
multidev-url: 'https://${{ steps.pr.outputs.multidev }}-bamblog.pantheonsite.io'
project-name: 'bamblog'
```

### BARC
```yaml
live-url: 'https://barc-DOMAIN.com'        # Replace with actual
multidev-url: 'https://${{ steps.pr.outputs.multidev }}-barc.pantheonsite.io'
project-name: 'barc'
```

### BayRen
```yaml
live-url: 'https://bayren-DOMAIN.com'      # Replace with actual
multidev-url: 'https://${{ steps.pr.outputs.multidev }}-bayren.pantheonsite.io'
project-name: 'bayren'
```

### HQQ
```yaml
live-url: 'https://hqq-DOMAIN.com'         # Replace with actual
multidev-url: 'https://${{ steps.pr.outputs.multidev }}-hqq.pantheonsite.io'
project-name: 'hqq'
```

### SFBRA
```yaml
live-url: 'https://sfbra-DOMAIN.com'       # Replace with actual
multidev-url: 'https://${{ steps.pr.outputs.multidev }}-sfbra.pantheonsite.io'
project-name: 'sfbra'
```

### VS (Vital Signs)
```yaml
live-url: 'https://vitalsigns-DOMAIN.com'  # Replace with actual
multidev-url: 'https://${{ steps.pr.outputs.multidev }}-vs.pantheonsite.io'
project-name: 'vs'
```

---

## 🔄 How Updates Work

### Updating the Action (Once for All Sites)

```bash
cd /Users/gustavorodiguezsalas/Work/covive/visual-regression-action

# Make changes to scripts
nano scripts/capture.mjs

# Test locally
export LIVE_URL=https://zerowastesv.org
export MULTIDEV_URL=https://dev-covive.pantheonsite.io
export PROJECT=covive
export URLS_PATH=/path/to/urls.json
node scripts/capture.mjs

# Commit changes
git add .
git commit -m "fix: Improve screenshot stability"
git push

# Tag new version
git tag v1.0.1
git tag -fa v1 -m "Update v1 to v1.0.1"
git push --tags --force
```

### All Sites Auto-Update!

Sites using `@v1` automatically get the update on next run.  
Sites using `@v1.0.0` stay on that specific version until manually updated.

---

## ✅ Checklist

### One-Time Setup
- [ ] Publish action repo to GitHub
- [ ] Tag as v1.0.0 and v1

### Per Site (×9)
- [ ] Create workflow file
- [ ] Update live-url
- [ ] Update multidev-url pattern
- [ ] Create urls.json
- [ ] Commit and push
- [ ] Test with a PR!

---

## 🎉 Benefits You Get

### Before (Current State):
```
❌ Duplicate scripts in each repo
❌ Manual updates across 9 repos
❌ Inconsistent behavior
❌ Hard to maintain
```

### After (With Composite Action):
```
✅ One shared codebase
✅ Update once, all sites benefit
✅ Semantic versioning
✅ Easy rollback
✅ Consistent behavior
✅ Independent execution per site
```

---

## 🧪 Testing

###Test the Action Locally (Before Publishing)

```bash
cd /Users/gustavorodiguezsalas/Work/covive/visual-regression-action

# Install dependencies
npm install

# Run a test
export LIVE_URL=https://zerowastesv.org
export MULTIDEV_URL=https://dev-covive2.pantheonsite.io
export PROJECT=test
export URLS_PATH=../regression-testing/covive/urls.json

node scripts/capture.mjs
node scripts/diff.mjs
node scripts/report.mjs
```

### Test in a Real Site Repo

1. Don't publish action yet
2. In site workflow, use local path:
   ```yaml
   uses: ./visual-regression-action  # Local testing
   ```
3. When working, publish and switch to:
   ```yaml
   uses: YOUR-ORG/visual-regression-action@v1
   ```

---

## 📞 Next Steps

1. **Publish the action repo** to GitHub
2. **Pick one site** (recommend covive) to test first
3. **Add workflow** to that site
4. **Open a test PR** and verify it works
5. **Replicate** to other 8 sites
6. **Celebrate!** 🎉

Want me to help with any specific step? Let me know! 🚀
