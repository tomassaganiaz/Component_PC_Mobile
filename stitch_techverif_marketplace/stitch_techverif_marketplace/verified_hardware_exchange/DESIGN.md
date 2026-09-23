---
name: Verified Hardware Exchange
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#444653'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#532a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#743d00'
  on-tertiary-container: '#ffa85d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Inter
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.5rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-mono-lg:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: -0.01em
  label-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a high-trust, engineering-grade marketplace for new and pre-owned PC hardware and smartphones. The brand balances strict forensic precision with consumer clarity, targeting tech enthusiasts, builders, developers, and value-conscious buyers who demand absolute validation before purchase.

The aesthetic blends **Modern Tech Minimalism** with **Industrial Precision Engineering**. Interfaces prioritize verified diagnostic metrics, component condition reports, and non-destructive hardware audit badges without visual clutter. The UI feels authoritative, calibrated, and secure, removing the anxiety traditionally associated with peer-to-peer pre-owned electronics.

## Colors

- **Primary (`#1E40AF` / Cobalt Blue):** Represents institutional authority, technical reliability, and structural navigation across critical actions, active tabs, and primary calls to action. Supported by `#2563EB` for hover/active states.
- **Secondary (`#059669` / Emerald Verification):** Dedicated exclusively to the third-party technical inspection layer (TechShield / HardwareCheck), certified functional badges, 100% health scores, and escrow release status.
- **Tertiary (`#D97706` / Amber Diagnostic):** Reserved for technical notices, cosmetic wear grading (e.g., Grade B/C), battery cycle thresholds, and auction expiry timers.
- **Neutral (`#0F172A` / Deep Slate):** Anchors high-contrast typography, structural rules, and deep contrast panels. Background canvases rely on pristine cool whites (`#F8FAFC`) and neutral card surfaces (`#FFFFFF`).

## Typography

Typography combines the structural neutrality of `Inter` for interface readability with `JetBrains Mono` for hardware serials, benchmark numbers, battery health percentages, and verification hashes. 

- Use `Inter` for navigation, listing titles, seller communications, and general descriptive copy.
- Use `JetBrains Mono` for part numbers (e.g., `RTX-4090-OC`, `SM-S928B/DS`), HardwareCheck certificate IDs, memory timings, and clock frequencies.

## Layout & Spacing

The layout is built on a 12-column fluid grid system on desktop (`min-width: 1024px`) with `1.5rem` gutters and a maximum canvas width of `1360px` centered with variable margins. Tablet viewports (`768px - 1023px`) utilize an 8-column layout with `1rem` gutters. Mobile viewports (`< 768px`) collapse to a 4-column layout with `1rem` external margins.

Vertical rhythm adheres strictly to multiples of `0.25rem` (4px baseline). Hardware attribute grids and inspection checklists utilize compact layouts with `space-sm` and `space-md` gaps to present dense engineering metrics legibly without unnecessary scrolling.

## Elevation & Depth

Visual hierarchy uses crisp, low-contrast borders combined with ultra-diffused, ambient micro-shadows.

- **Surface Neutral (Ground):** `#F8FAFC` base page background.
- **Surface Elevated 1 (Cards & Data Panels):** `#FFFFFF` with a `1px solid #E2E8F0` border and `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.05)`.
- **Surface Elevated 2 (Dropdowns, Inspection Modals, Pinned Action Bars):** `#FFFFFF` with `1px solid #CBD5E1` and `box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.03)`.
- **Verified TechShield Accent Elevation:** Certified inspection seals and cards apply a subtle `0 0 0 1px #059669` emerald inset halo and an ambient green aura `0 4px 14px 0 rgba(5, 150, 105, 0.08)` to emphasize authenticity.

## Shapes

The design system implements a soft, engineered profile (`roundedness: 1`). 
- Interactive components such as buttons, text inputs, chip toggles, and small badges use `0.25rem` (4px).
- Product cards, technical report modules, and diagnostic charts use `0.5rem` (8px).
- Verification seals and floating security indicators utilize dedicated circular or continuous pill forms only where necessary to emphasize seal/stamp authenticity.

## Components

### Buttons
- **Primary:** Solid `#1E40AF` with high-contrast `#FFFFFF` text. Flat finish with a 1px border (`#1D4ED8`). On hover, transitions to `#1D4ED8`. Active state deepens to `#172554`.
- **Verified Action (Buy with TechShield Escrow):** Solid `#059669` background, white text, integrated lock/check icon, subtly elevated to denote transactional security.
- **Secondary:** Transparent background, `1px solid #CBD5E1`, text `#0F172A`. Hover transitions background to `#F1F5F9`.

### Technical Verification Badges (TechShield / HardwareCheck)
- Compact rectangular badge with a 4px corner radius.
- Background: `#ECFDF5`, Border: `1px solid #A7F3D0`, Text: `#065F46`, Font: `JetBrains Mono` 11px uppercase bold.
- Includes a leading verified shield icon, explicit test result (e.g., `PASSED: 42/42 PTS`), and an expandable tooltip showing benchmark cryptographic hash.

### Product & Hardware Cards
- Surface: `#FFFFFF` encased in a `1px solid #E2E8F0` frame.
- Image zone features neutral gray backdrops with precise aspect ratios (4:3 or 1:1), displaying condition tags (e.g., `OEM BOX`, `REFURBISHED GRADE A`).
- The bottom edge houses a diagnostic bar indicating battery health, thermal test results, or warranty duration before displaying the price in high-contrast deep slate.

### Diagnostic Sliders, Checkboxes & Toggles
- Checkboxes: Rigid 4px rounded rectangles with a 1.5px border in `#64748B`. Checked state renders `#059669` background with a crisp white check mark.
- Technical Specs Accordion: Flat border dividers (`1px solid #E2E8F0`) with mono-spaced parameter labels on the left and validated values on the right.

### Input Fields & Search Bars
- Background: `#FFFFFF` surrounded by `1px solid #CBD5E1`.
- Focused state: Focus ring with `0 0 0 2px rgba(30, 64, 175, 0.2)` and border color shifted to `#1E40AF`.
- Search bars in the header include hotkey hints in monospace (e.g., `[CTRL + K]`) and dedicated quick-filter tags for component sockets (e.g., `AM5`, `LGA1700`).