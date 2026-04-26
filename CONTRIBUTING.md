# Contributing to DishaOS

First off, thank you for considering contributing to DishaOS. It's people like you that make DishaOS an elite autonomous intelligence framework. 

### 1. Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check if there is an [open issue](https://github.com/Tashima-Tarsh/Disha/issues) already. If not, open a new one using our templates!

### 2. Fork & create a branch

If this is something you think you can fix, then [fork DishaOS](https://github.com/Tashima-Tarsh/Disha/fork) and create a branch with a descriptive name.

```bash
git checkout -b feat/your-feature-name
```

### 3. Implement your fix or feature

At this point, you're ready to make your changes. Feel free to ask for help; everyone is a beginner at first.

### 4. Code Quality & Standards

DishaOS operates at a top-tier standard. Before you commit, you must ensure your code is linted and tested.

**For TypeScript/JavaScript:**
```bash
bun run lint
```

**For Python (AI Platform):**
```bash
ruff check disha/ --output-format=github
ruff format disha/ --check
```

### 5. Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with DishaOS's master branch:

```bash
git remote add upstream https://github.com/Tashima-Tarsh/Disha.git
git checkout main
git pull upstream main
```

Then update your feature branch from your local copy of main, and push it!

```bash
git checkout feat/your-feature-name
git rebase main
git push --set-upstream origin feat/your-feature-name
```

Finally, go to GitHub and [make a Pull Request](https://github.com/Tashima-Tarsh/Disha/compare) :D

### 6. Code Review

Your PR will be reviewed by the core team. We may ask for changes or further testing. Once approved, it will be merged into the `main` branch.

Welcome to the inner circle.
