# Todoist — Style Reference
> Warm, minimal productivity suite. Like a neatly organized desk bathed in natural light.

**Theme:** light

This design system presents a clean, business-casual aesthetic, grounded in warm off-white and charcoal neutrals, punctuated by a signature vibrant red-orange. The generous use of rounded corners (15px for prominent elements, 8px for most others) softens the utilitarian feel of the task manager, while subtle, low-opacity shadows add minimal depth without visual clutter, creating an approachable, yet professional, interface.

## Colors

| Name | Value | Role |
|------|-------|------|
| Faded Charcoal | `#25221` | Primary text, headings, icons, borders, prominent interactive elements. It's the dominant dark shade, appearing in place of true black. |
| Paper White | `#fefdfc` | Page backgrounds, card surfaces, primary light background. Provides a soft, warm canvas contrasting with Faded Charcoal. |
| Soft Gray | `#d7d6d4` | Subtle borders, inactive elements, muted backgrounds. A pale, desaturated gray for separation without harshness. |
| Light Peach | `#fff6f0` | Occasional background accents, footer background, illustration fills. A very pale, warm background hint. |
| Subtle Ash | `#6f6c69` | Secondary text, descriptive elements, subdued icons. Provides hierarchy without being too light. |
| True Black | `#000000` | System icons, some text elements. Used sparingly, mostly for icon rendering or specific high-contrast text. |
| Dusty Sage | `#94928f` | Tertiary text, subtle icon detailing. Further de-emphasizes content. |
| Action Red | `#e34432` | Primary call-to-action buttons, active navigation indicators, key interactive elements. This vivid red stands out against the muted palette. |
| Link Orange | `#cf3520` | Inline links, slightly darker shade of brand red used for text. |
| Accent Blue | `#0f66ae` | Secondary links, distinct interactive elements. A cool counterpoint to the dominant red. |
| Teal Accent | `#497d7` | Specific illustrative text or decorative elements. A muted teal that occasionally appears as an accent. |
| Success Green | `#4c7a45` | Success states, specific informational badges. A moderate green for positive affirmation. |
| Badge Green | `#446c3d` | Text color for specific badges, slightly darker than Success Green. |
| Light Green Tint | `#f0f6df` | Background for success badges. A very light, near-gray green. |

## Typography

### Graphik — Primary display and heading font. Used for prominent titles and key marketing messages. The slight tightening of letter spacing at larger sizes gives it a refined, bespoke feel, avoiding the sprawl of default sans-serifs.
- **Substitute:** system-ui
- **Weights:** 400, 600, 700
- **Sizes:** 16px, 22px, 38px, 44px, 55px
- **Line height:** 1.00, 1.15, 1.28
- **Letter spacing:** -0.0100em at 55px, -0.0050em at 44px, 16px, 22px, 38px

### Inter — Primary body font, UI elements, buttons, links, and forms. Its wide range of weights and subtle tracking variations ensure readability and visual hierarchy across all transactional and informational content.
- **Substitute:** system-ui
- **Weights:** 400, 475, 500, 600, 625, 700
- **Sizes:** 12px, 14px, 15px, 16px, 17px, 18px, 19px, 21px
- **Line height:** 1.00, 1.35, 1.40, 1.50, 1.60, 1.75
- **Letter spacing:** 0.0050em at 21px, 0.0100em at 18px, 0.0120em at 19px, 0.0250em at 17px

### Arial — Fallback font for specific input elements, indicating utilitarian use where broad system compatibility is prioritized over specific branding.
- **Substitute:** system-ui
- **Weights:** 400
- **Sizes:** 13px
- **Line height:** 1.20
- **Letter spacing:** normal

### Caecilia — Used for specific body text sections, particularly for testimonials or quotes. Its serif nature provides a distinct, classic, and editorial feel, breaking the sans-serif dominance.
- **Substitute:** serif
- **Weights:** 400
- **Sizes:** 20px
- **Line height:** 1.80
- **Letter spacing:** normal

### Shantell Sans — Rarely used, possibly for decorative or illustrative text. Its distinct, informal style provides a whimsical contrast to the otherwise structured design.
- **Substitute:** cursive
- **Weights:** 400
- **Sizes:** 19px
- **Line height:** 1.60
- **Letter spacing:** 0.0100em

## Spacing & Layout

**Base unit:** 4px

**Density:** comfortable

- **Section gap:** 64px
- **Card padding:** 0px
- **Element gap:** 4px

### Border Radius

- **cards:** 10px
- **badges:** 6px
- **images:** 15px
- **buttons:** 15px
- **default:** 8px

## Components

### Primary Action Button
**Role:** Main call to action

Background: Action Red (#e34432), Text: Paper White (#ffffff), Border Radius: 15px, Padding: 12px vertical, 16px horizontal. Prominent for guiding user actions.

### Text Only Button
**Role:** Secondary action in nav/toolbar

Background: transparent, Text: Faded Charcoal (#25221e), Border: Faded Charcoal (#25221e), Border Radius: 8px, Padding: 9px vertical, 14px horizontal. Minimalist interaction for less emphasis.

### Subtle Action Button
**Role:** Tertiary actions, filters, or less critical interactions

Background: rgba(37, 34, 30, 0.07), Text: Faded Charcoal (#25221e), Border: Faded Charcoal (#25221e), Border Radius: 8px, Padding: 8px all sides. Provides a hint of background for subtle interaction.

### Hero Pill Button
**Role:** Prominent, often decorative buttons in hero sections

Background: rgba(37, 34, 30, 0.83), Text: Paper White (#ffffff), Border: Paper White (#ffffff), Border Radius: 15px, Padding: 0px vertical, 27px horizontal. Large, rounded, and dark for visual impact.

### Feature Card
**Role:** Information display, grouping related content

Background: Paper White (#fefdfc), Border Radius: 10px, Shadow: rgba(37, 34, 30, 0.04) 0px 1px 0px 0px, Padding: 0px. A clean, slightly elevated surface for content sections.

### Success Badge
**Role:** Status indicators or small informational tags

Background: Light Green Tint (#f0f6df), Text: Badge Green (#446c3d), Border Radius: 6px, Padding: 4px vertical, 8px horizontal. Clearly signals positive status.

### Form Input Field
**Role:** User data entry

Background: transparent, Text: Faded Charcoal (#25221e), Border: Faded Charcoal (#25221e), Border Radius: 8px, Padding: 7px vertical, 32px right, 35px left. Features generous horizontal padding for internal iconography or labels.

## Do's and Don'ts

### Do
- Use Action Red (#e34432) exclusively for primary calls-to-action and active states to maintain visual prominence.
- Apply 15px border-radius to prominent interactive elements like buttons and large images for a soft, friendly aesthetic.
- Utilize Graphik for all main headings and titles, ensuring distinct letter spacing: -0.0100em at 55px, -0.0050em at 44px, and normal at smaller sizes.
- Maintain a clear hierarchy using Paper White (#fefdfc) for backgrounds and Faded Charcoal (#25221e) for primary text and elements.
- Employ the subtle shadow rgba(37, 34, 30, 0.04) 0px 1px 0px 0px for all cards to provide slight elevation without heavy visual weight.
- Ensure generous padding on interactive elements, like 12px vertical and 16px horizontal for primary buttons, to create comfortable touch targets.

### Don't
- Do not use true black (#000000) for body text; instead, use Faded Charcoal (#25221e) or Subtle Ash (#6f6c69) for softer contrast.
- Avoid using multiple chromatic colors in close proximity; the palette should remain largely neutral with controlled accents.
- Do not use sharp corners; the minimum border-radius for UI elements should be 6px (for badges), with 8px and 15px being more common.
- Refrain from using heavy or multiple shadows; subtle single-layer shadows are the standard for elevation.
- Do not introduce new decorative fonts beyond Caecilia unless specifically approved; maintain the Graphik and Inter pairing.
- Avoid making inline links blend with body text; always use Link Orange (#cf3520) or Accent Blue (#0f66ae) for clear distinction.

## Elevation

- **Feature Card:** `rgba(37, 34, 30, 0.04) 0px 1px 0px 0px`
- **Prominent Buttons:** `rgba(37, 34, 30, 0.07) 0px 14px 19px -9px, rgba(37, 34, 30, 0.18) 0px 10px 48px 0px`

## Imagery

The visual language focuses on clean product screenshots of the Todoist app, often embedded within device mockups (like phones or laptops). These are typically contained within a design, not full-bleed, and often have generous rounded corners (15px). Photography is absent. Illustrations are minimal, sometimes involving abstract, squiggly lines or simple star shapes (#fff6f0 for fills) used decoratively in backgrounds, providing a touch of playfulness without being distracting. Icons are primarily line-based or solid, rendered in Faded Charcoal or True Black, often accompanying text to explain features. The overall density suggests a balance between UI elements and supportive, explanatory visuals.

## Layout

The page primarily uses a max-width contained layout, with content centered. The hero section often features a prominent headline and text on the left, paired with a device mockup on the right. Below the hero, the content typically alternates between text-left/image-right and text-right/image-left sections, providing an engaging rhythm. Sections are clearly delineated by consistent vertical spacing (sectionGap) and sometimes subtly different background colors (like Light Peach for the footer). There are clear examples of multi-column layouts, particularly for feature grids or testimonials (3-column layout implied by testimonial spacing). The navigation is a sticky top bar with a mix of text links and a prominent 'Start for free' button.

## Similar Brands

- **Asana** — Shares a clean, light SaaS UI with a focus on task management tools and subtle color accents for interaction cues.
- **Notion** — Employs a warm, almost-white background, minimal design, and a blend of custom and system fonts for professional clarity without appearing cold.
- **ClickUp** — Utilizes a functional, modern design approach with clear typography, intuitive layouts, and controlled use of brand colors for hierarchy.
- **Monday.com** — Features a light, inviting color palette, rounded elements, and a similar approach to using product screenshots within device mockups.
