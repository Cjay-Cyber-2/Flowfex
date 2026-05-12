---
name: ui-ux-pro-max
description: |
  UI / UX design intelligence skill. Curated databases of UI styles, color
  palettes, font pairings, chart types, landing-page structures, and UX
  guidelines for product, mobile, web, and spatial apps. Use when the user
  asks for design recommendations, style direction, typography pairings,
  palette selection, landing-page structure, chart selection, or general
  UX best practices.
license: MIT
metadata:
  author: ui-ux-pro-max-skill
  version: "1.0.0"
  sourceRepository: https://github.com/Cjay-Cyber-2/ui-ux-pro-max-skill.git
---

# UI / UX Pro Max

This skill bundles a searchable design intelligence toolkit covering:

- **Product types** — SaaS, e-commerce, portfolio, dashboard, mobile app, AI
  product, marketing site
- **UI styles** — glassmorphism, minimalism, brutalism, neumorphism, retro,
  editorial, claymorphism, dark + light variants
- **Typography pairings** — Google Fonts combinations indexed by mood,
  industry, and product type
- **Color palettes** — palettes mapped to product type, mood, brand keyword,
  and accessibility (WCAG AA / AAA) contrast targets
- **Landing pages** — section structure, CTA strategies, social-proof
  patterns, hero formats
- **Charts** — chart type recommendations and library suggestions
  (Recharts, D3, Vega-Lite, Chart.js, ECharts, Apache, Plotly)
- **UX guidelines** — best practices and anti-patterns for navigation,
  forms, onboarding, empty states, errors, search, and accessibility
- **Frontend stacks** — code templates for html-tailwind, react, nextjs,
  astro, vue, nuxtjs, nuxt-ui, svelte, swiftui, react-native, flutter,
  shadcn, jetpack-compose

## When to apply

Use this skill whenever the user:

- Asks "what style / color / font / chart should I use for X?"
- Asks for a landing page structure or section layout
- Asks for UX critique or accessibility recommendations
- Asks for a design system starter or component palette
- Needs platform-specific UI guidance (iOS, Android, visionOS, web)

## How to use

1. Read the user's product type, audience, and desired feeling.
2. Recommend a product type from the indexed list (SaaS, dashboard, etc.).
3. Match a UI style and palette to that product type + mood.
4. Pair the chosen palette with a typography pairing for that mood.
5. Provide a landing-page section blueprint with CTAs and social proof.
6. Provide chart and library recommendations if data visualization is in
   scope.
7. Cite the relevant UX guideline or anti-pattern for each recommendation.

## Output format

Return a single design brief with these sections:

- Product type
- Style direction (one primary, one alternate)
- Color palette (hex values + role: primary / accent / surface / text)
- Typography pairing (heading font + body font + weights)
- Landing-page outline (hero → social proof → product → pricing → CTA)
- Chart recommendations (if applicable)
- UX risks to avoid

## Best practices

- Always check accessibility contrast against the chosen palette.
- Prefer system fonts for product UI and editorial fonts for marketing.
- Anchor landing-page structure in measurable conversion goals.
- Use empty-state, loading-state, and error-state examples in deliverables.

## Notes

This skill's underlying CSV-indexed data was authored upstream in
`ui-ux-pro-max-skill` (Cjay-Cyber-2). When Flowfex routes a design task to
this skill, the agent should treat the recommendations as informed
heuristics and adapt them to the brand and accessibility constraints of
the calling product.
