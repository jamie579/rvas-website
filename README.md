# rvas.co.uk — Rivelin Valley Allotment Society website

Static website for the Rivelin Valley Allotment Society (Roscoe Plantation
Allotments, Sheffield), built with [Hugo](https://gohugo.io) and hosted free
on GitHub Pages. Pushing to `main` publishes the site automatically via
GitHub Actions (`.github/workflows/hugo.yml`).

## Editing the site

All the words live in `content/` as Markdown files:

| File | Page |
|---|---|
| `content/_index.md` | Home page intro text |
| `content/about.md` | About us |
| `content/history.md` | Our history |
| `content/join.md` | Join us |
| `content/contact.md` | Contact & find us |
| `content/news/` | News posts (one file per post) |

### Adding a news post

Create a new file in `content/news/`, e.g. `plant-sale-2027.md`:

```markdown
+++
title = 'Plant sale 2027'
date = 2027-05-01
description = 'Our annual plant sale returns.'
+++

Body text here…
```

Commit and push (or edit directly on github.com and press *Commit changes*) —
the site rebuilds itself in about a minute.

### House rules for content

- **Never** put bank details, members' names, personal email addresses or
  phone numbers on the site. The only published contact is
  `rvascontact@gmail.com`.
- Only publish photos where people aren't identifiable, or where everyone
  pictured has agreed.
- British English, please.

## Local preview

```
brew install hugo   # once
hugo server         # then open http://localhost:1313
```

## Images

Put images in `static/images/` and reference them as `/images/filename.jpg`.
Resize photos to ≤1600px on the long edge before committing.
