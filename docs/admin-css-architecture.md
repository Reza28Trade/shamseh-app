# Admin CSS Architecture

## Objective

The admin panel has one visual source of truth and independent page composition.

- The central design system owns brand colors, light/dark surfaces, typography, controls, card surfaces, borders, radii, shadows, focus states and shared component states.
- Each module stylesheet owns page composition: grids, columns, ordering, spacing, dimensions, overflow, filters, table data layout and responsive arrangement. It may also own genuinely domain-specific data visualizations and semantic states that are not shared components (for example, a chart series or a speaker-specific message bubble).
- Module styles must consume the central tokens. They must not create a local palette, card treatment, typography scale, control appearance or shadow/radius system.
- Dashboard and Manage Admins are approved visual baselines. Their CSS and appearance are excluded from the cross-module component normalization.

## Central ownership

### `src/styles/admin/core/`

- `AdminTokens.css`: Shamseh brand tokens, spacing/radius primitives, semantic status colors, data-series colors, approved shell surfaces/actions and elevation tokens. It contains variables only; it does not style components.
- `AdminTheme.css`: canonical light/dark values and semantic surface aliases. All theme-dependent component colors resolve through these variables.
- `AdminComponents.css`: the single canonical visual component layer. It is loaded after module styles so shared appearance wins over legacy declarations. It owns page typography, controls, buttons, tables, cards, headers, statistic tiles, row surfaces, focus states and common responsive visual treatment.
- `AdminComponents.extended.css`: structural compatibility only. It may define grid/flex behavior, min-width, overflow, table minimum widths and responsive column arrangements. It must not define colors, backgrounds, borders, radii, shadows, typography or control appearance.
- `AdminLayout.css`: admin shell, sidebar, mobile header and responsive shell layout.

The obsolete `src/styles/AdminLegacy.css` compatibility layer has been deleted. Static inline presentation has been migrated to classes; the remaining inline styles in student and course management are data-driven chart/progress values and must remain dynamic.

### Load and ownership order

1. `AdminTokens.css`
2. `AdminTheme.css`
3. `AdminComponents.extended.css`
4. `AdminLayout.css`
5. Page-owned module styles
6. `AdminComponents.css` as the final shared visual layer

The former `AdminComponents.overrides.css` was removed. Shared appearance must never be split across multiple late override files.

## Module ownership

All admin module styles live under `src/styles/admin/pages/`.

- `Dashboard.css`: approved dashboard composition and appearance.
- `ManageAdmins.css`: approved manager-account composition and appearance.
- `ManageCourses.css`, `ManageStudents.css`, `ManageOfflineRequests.css`, `ManageCounseling.css`, `ManageMessages.css`, `ManageNotifications.css`, `ManageManagementContact.css`, `ManageMockExams.css`, `ManageRegistrations.css`, `ManagePublicContent.css`, and `AuditLogs.css`: page composition and domain-specific visualizations/status states only; shared cards, controls, typography, tables and component appearance are centralized.

The messages inbox and management-feedback inbox remain separate modules with distinct page roots: `.admin-messages-page` and `.admin-management-contact-page`.

Student and counselor portals remain separate authenticated experiences with their own composition. They consume the same Shamseh/Admin theme tokens where appropriate, but are not forced into the admin page-component cascade.

## Rules for future CSS changes

1. Change a shared visual property once, in the central token/theme/component layer.
2. Page CSS may set layout properties such as `display`, `grid-template`, `gap`, `padding` where it is genuinely part of composition, `width`, `min-width`, `max-width`, `overflow`, `order`, `align` and responsive layout. It may retain unique data-viz colors and semantic states only when they are not reusable shared components.
3. Page CSS must not redefine shared card backgrounds, borders, radii, shadows, typography, control surfaces or focus states.
4. Do not add a new compatibility or override layer to solve a cascade conflict. Fix ownership at the source.
5. Do not use blanket selectors that turn every child into a card.
6. Do not use `!important` to compensate for incorrect stylesheet order or duplicated ownership.
7. Preserve semantic status colors through central semantic tokens.
8. Preserve Dashboard and Manage Admins exactly as the approved reference screens.
9. Do not change business logic, APIs, permissions, data models or workflows as part of CSS work.

## Current refactor boundary

This refactor centralizes shared visual ownership, removes the duplicate late override stylesheet and the obsolete inline-style compatibility layer, and keeps the extended layer structural. Shared component appearance has been removed from module stylesheets; remaining page-local visual rules are limited to domain-specific data visualization, semantic states and separators. It does not change page workflows or the approved Dashboard/Manage Admins reference designs.
