---
name: copywriter
description: |
  Write compelling UX copy, marketing content, and product messaging. Use when
  writing button labels, error messages, landing pages, emails, CTAs, empty states,
  tooltips, or any user-facing text that must be clear, concise, and actionable.
license: Apache-2.0
metadata:
  author: agentic-insights
  version: "1.1"
  source: syniq-catalog
tags:
  - copywriting
  - ux-writing
  - marketing
  - content
  - product
category: productivity
---

# Copywriter

Write clear, compelling copy for products, marketing, and UX.

## When to use

- Button labels, CTAs, and form actions
- Error messages, validation text, and recovery paths
- Empty states, onboarding, and tooltips
- Landing page hero, feature blurbs, and announcements
- Welcome, transactional, and campaign emails

## Scope

| Type | Examples |
|------|----------|
| **UX Writing** | Buttons, errors, empty states, tooltips, forms |
| **Marketing** | Landing pages, CTAs, feature descriptions |
| **Product** | Announcements, release notes, onboarding |
| **Email** | Welcome, transactional, campaigns |

## Core Formulas

### Buttons

Use **Verb + Noun** — never generic labels.

| Bad | Good |
|-----|------|
| Submit | Save changes |
| OK | Got it |
| Click here | Start free trial |
| Learn more | See pricing |

### Errors

Structure: **What happened → Why (if helpful) → How to fix**

```
"Please enter a valid email address"
"Password must be at least 8 characters"
"Payment failed. Check your card details or try another card."
"Something went wrong, but your data is safe. Try again in a moment."
```

Rules:
- Avoid blame ("You entered…" → "Enter a valid…")
- Offer one clear next step
- Keep tone calm and reassuring

### Empty states

Structure: **Headline → Explanation → Action**

```
Headline:    "No results found"
Explanation: "Try adjusting your filters or search terms."
Action:      [Clear filters]
```

### CTAs

Formula: **Verb + Benefit + Remove friction**

| Weak | Strong |
|------|--------|
| Sign up | Start free trial |
| Learn more | Get started free |
| Submit | Download the template |

### Headlines

Patterns:

- "How to [goal] without [pain point]"
- "[Number] ways to [benefit]"
- "Get [outcome] in [timeframe]"
- "[Outcome] for [audience] who [situation]"

Lead with the outcome, not the feature name.

## Voice and tone

**Voice** (consistent across the product):

- Professional but friendly
- Clear and concise
- Helpful and supportive

**Tone** (adjust by context):

| Context | Example |
|---------|---------|
| Success | "All set! Your changes are live." |
| Error | "Something went wrong, but your data is safe." |
| Urgency | "Action required: suspicious login detected" |
| Neutral | "Review your settings before continuing." |

## Power words (use sparingly)

| Category | Words |
|----------|-------|
| Urgency | Now, today, limited, fast |
| Value | Free, save, bonus, extra |
| Trust | Guaranteed, proven, secure |
| Ease | Easy, simple, quick, instant |

Prefer specificity over hype: "Save 2 hours per week" beats "Save time fast."

## UX patterns reference

### Forms

- Label above field; placeholder is hint only, not the label
- Helper text under field for format expectations
- Inline validation after blur or submit — not on every keystroke unless live preview helps

### Tooltips

- One sentence; explain jargon or non-obvious controls
- Never hide required instructions inside tooltips alone

### Loading and progress

- "Saving…" / "Uploading 3 of 10 files…" — show state, not spinner-only silence

### Confirmation dialogs

- Title states the action: "Delete project?"
- Body explains irreversible impact
- Primary = destructive action label; secondary = safe escape ("Cancel")

## Marketing copy reference

### Landing page sections

1. Hero: outcome headline + subhead + primary CTA
2. Problem: mirror the reader's pain in their words
3. Solution: how the product fixes it (benefits, not feature list)
4. Proof: testimonial, metric, or logo strip
5. CTA repeat: same primary action, friction removed

### Email

- Subject: specific benefit or curiosity (under ~50 chars when possible)
- Preview: extends subject, does not repeat it
- Body: one primary CTA; scannable bullets

## Output format

When applying this skill, deliver:

1. **Context** — audience, surface (button, error, email, etc.), goal
2. **Recommended copy** — primary version
3. **Alternatives** — 2–3 short variants when useful
4. **Rationale** — one line on why (clarity, friction, tone)

## Quality checklist

- [ ] Clear? (12-year-old test — no jargon without explanation)
- [ ] Concise? (remove filler: "please note that", "in order to")
- [ ] Specific? (numbers, timeframes, concrete outcomes)
- [ ] Actionable? (reader knows what to do next)
- [ ] Scannable? (headings, bullets, short paragraphs)
- [ ] Accessible? (plain language, sufficient contrast in UI copy notes)
- [ ] Consistent? (matches product voice; same terms for same concepts)

## Mistakes to avoid

- Generic buttons ("Submit", "OK", "Click here")
- Blaming the user in errors
- Clever headlines that obscure the offer
- Multiple competing CTAs on one screen
- Feature-first copy without the user outcome
- Placeholder or lorem ipsum in final deliverables
