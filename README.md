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
| `content/contact.md` | Contact and arranged visits |
| `content/volunteer.md` | Workplace volunteering, plot sharing and helping members |
| `content/tool-library.md` | Tool induction guidance and checklist links |
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
- Keep plot numbers, site maps, directions, access details and equipment or
  storage information off the public site, including downloads and metadata.
  Arrange visits and share practical details by email. The full constitution
  is available on request.
- British English, please.

### Tool induction forms

The Tool Library page links to four Google Forms owned by the RVAS account:
petrol and electric strimmers, and petrol and electric hedge cutters.
Public responder URLs are in `data/tool_checklists.json`; never substitute edit
links or response spreadsheet links. Each form collects a responder-entered email,
has response copies set to **Always**, and saves to its own private response sheet
in the RVAS Drive folder **Tool Library – Inductions**. Response summaries and
response editing are disabled. Members complete the checklists in the first person
and enter their own typed sign-off. There are no demonstrator name or sign-off fields.
In each form, **Responses → More → Get email notifications for new responses** is
enabled while signed in as `rvascontact@gmail.com`, so the RVAS team can review
submissions from that inbox. A notification does not itself approve solo use.
The brush cutter and chainsaw forms have been withdrawn from public use.
Keep checklist changes consistent with the approved source guidance.

### Garden animation

The growing garden runs once on larger screens with a fine pointer. It is
disabled at widths up to 900px, on touch-first devices and when reduced motion
is requested. Resizing only the viewport height does not restart it.

## Local preview

```
brew install hugo   # once
hugo server         # then open http://localhost:1313
```

## Images

Put images in `static/images/` and reference them as `/images/filename.jpg`.
Resize photos to ≤1600px on the long edge before committing.
