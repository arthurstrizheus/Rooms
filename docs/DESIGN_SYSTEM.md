# Design system

The front end is built on one design system rather than per-page styling. If
you're adding a screen, read this first — almost everything you need already
exists.

## Where things live

| What | Where |
| --- | --- |
| Tokens + MUI component overrides | `src/Utilites/theme.js` |
| Shared UI primitives | `src/Views/Components/UI/` |
| App shell (nav, top bar, bottom bar) | `src/Views/Components/Shell/` |
| Responsive breakpoint flags | `src/hooks/useResponsive.js` |
| FullCalendar theme | `src/Views/Components/UI/fullcalendar.css` |

## Tokens

`theme.js` is the single source of truth. Read from the theme; don't hardcode
hex values in pages.

- **Color** — `#C8102E` (PANTONE 186 C) is the S-E-A brand color and is fixed.
  It's exposed as `primary`, with tint steps `primary.50` … `primary.900`.
  Surrounding neutrals are deliberately near-neutral so the red reads as an
  accent. Semantic colors: `success`, `warning`, `info`, `error`.
- **Type** — Inter, loaded in `public/index.html`, with a system fallback stack.
  Headings use tight letter-spacing; `theme.typography.fontFamilyMono` is for
  serials, asset numbers and IDs.
- **Radius** — `theme.radius` (`sm` 8 → `xxl` 24, `pill`).
- **Elevation** — `theme.shadowTokens` (`xs` → `xl`, plus `brand` and `focus`).
  The default MUI `shadows` array is remapped onto these, so `elevation={n}`
  lands on the system too.
- **Motion** — `theme.motion`. The house easing is `emphasized`
  (`cubic-bezier(0.22, 1, 0.36, 1)`); `spring` adds a slight overshoot for
  press feedback. Durations live in `theme.motion.duration`.

Legacy palette keys (`background.fill.*`, `border.*`, `alert.*`,
`primary.selected`) are kept and re-pointed at the new ramp so older code stays
coherent.

## Primitives

Import from `src/Views/Components/UI`:

- `PageHeader` — title, subtitle, breadcrumbs, back control and actions. Pass
  actions as objects; below `md` only those marked `primary` stay visible and
  the rest collapse into an overflow menu, so headers never wrap on a phone.
- `PageContainer` — responsive gutters, max width, and bottom padding that
  clears the iOS home indicator.
- `SectionCard` — titled surface with icon, action slot and optional collapse.
  Replaces the old `MainCard` / `SubCard`.
- `StatCard` — a single headline number with an optional trend.
- `StatusChip` — **the** status vocabulary. Maps any status string to a tone and
  a label; unknown values are title-cased rather than dropped. Don't write new
  status→color mappings.
- `DetailField` — label/value pair; falls back to an em dash when empty.
- `EmptyState` — for empty lists, cleared filters and error fallbacks.
- `FilterBar` — search plus filter controls. Inline on desktop; below `md` the
  controls move into a bottom sheet behind a badge-counted button, with active
  filters shown as removable chips in both layouts.
- `ResponsiveDialog` — **use this for every dialog.** Goes full screen and
  slides up from the bottom below `sm`, keeps the title and action bar sticky,
  and pads the footer past the home indicator.
- Skeletons — `CardGridSkeleton`, `RowSkeleton`, `StatRowSkeleton`,
  `DetailSkeleton`. Prefer these over a centered spinner.
- Motion helpers — `RiseIn`, `FadeIn`, `ScaleIn`, `Stagger`, `hoverLift`.

## Responsiveness

Use `useResponsive()`, never a user-agent check:

```js
const { isMobile, isTablet, isDesktop, isCompact, isTouch } = useResponsive();
```

`isCompact` (< 900px) is the usual "give me the stacked layout" flag. The rules
of thumb:

- Tables become cards below `md`. A table with more than four columns is not
  usable on a phone.
- Tap targets stay at least 40px.
- Inputs are 16px on mobile, otherwise iOS Safari zooms the viewport on focus.
- Anything fixed to the bottom clears `env(safe-area-inset-bottom)` and the
  mobile bottom bar (`BOTTOM_NAV_HEIGHT`).

## Navigation

`src/Views/Components/Shell/navConfig.js` drives the desktop sidebar, the mobile
drawer, the mobile bottom bar and the top-bar page title. Adding a page means
editing that one list plus `Routes.js` — and the `can(user)` guards there must
stay in step with the route guards.

## Motion

Animation is CSS-driven, using keyframes injected once by the theme
(`seaRiseIn`, `seaFadeIn`, `seaScaleIn`, `seaSlideInLeft`, `seaShimmer`,
`seaPulseRing`). All of it respects `prefers-reduced-motion` through a global
media query, so don't re-implement that per component.

Conventions: pages rise in on route change, lists stagger, dialogs grow on
desktop and slide up on mobile, and presses scale down slightly.

## Tests

`src/smoke.test.js` covers the tokens and primitives; `src/pages.test.js` mounts
every route with the network and socket layers stubbed. Run `npm test`. If you
add a page, add it to `pages.test.js` — it's cheap and it catches the runtime
mistakes the build can't.
