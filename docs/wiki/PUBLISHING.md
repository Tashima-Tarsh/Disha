# Publishing To GitHub Wiki

GitHub Wikis are stored in a separate git repository (`<repo>.wiki.git`).

This repo keeps Wiki content under `docs/wiki/` so it can be reviewed via PRs and CI.

To publish:

1. Enable Wiki in GitHub repo settings.
2. Clone the wiki repo locally:

```bash
git clone https://github.com/<owner>/<repo>.wiki.git
```

3. Copy contents of `docs/wiki/` into the wiki repo root, then commit/push.

