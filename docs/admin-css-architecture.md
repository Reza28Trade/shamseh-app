# Admin CSS Architecture

## Goal

The admin panel has one visual source of truth and independent module structure.

- Shared visual identity is centralized: brand colors, light/dark surfaces, typography scale, controls, cards, borders, radii, shadows, focus states and responsive shell behavior.
- Each module owns its content structure and layout: grids, ordering, filters, forms, tables, workflows and module-specific composition.
- A module stylesheet may control placement and dimensions, but must consume the shared tokens and shared component language rather than inventing its own palette or component appearance.
- Dashboard and Manage Admins are approved reference modules. Their existing composition and appearance must be preserved unless explicitly approved for change.

## Central styles

### `src/styles/admin/core/`

- `AdminTokens.css`: canonical Shamseh brand, spacing, radius and control tokens.
- `AdminTokens.css` also owns shared semantic status, overlay, modal-elevation and data-visualization colors; modules must consume these tokens rather than define local palettes.
- `AdminTheme.css`: canonical light/dark values for the `--admin-*` surface variables. These values were moved unchanged from the former inline style object in `AdminLayout.tsx`.
- `AdminTheme.css` also maps semantic content-surface aliases (`--admin-content-*`) and course-panel surfaces to the canonical theme values, so page styles do not reference undefined surface tokens.
- `AdminComponents.css`: shared admin controls and common page foundations.
- `AdminComponents.extended.css`: cross-module responsive and compatibility patterns, loaded before page-owned styles so a module can retain control of its own composition.
- `AdminLayout.css`: shell, sidebar, mobile header and responsive layout rules formerly mixed into the large design-system stylesheet.

### Import and ownership order

The admin shell loads shared styles in this order: `AdminTokens.css`, `AdminTheme.css`, `AdminComponents.css`, `AdminComponents.extended.css`, `AdminLegacy.css`, then `AdminLayout.css`. `AdminDesignSystem.css` has been retired: shell presentation now lives in `AdminLayout.css`, while shared legacy compatibility rules live in `AdminLegacy.css`.

Each page imports its own stylesheet from its page component. Page-owned CSS follows the shared compatibility layers and owns the final composition of that module. Dashboard and Manage Admins retain their dedicated imports from `App.tsx`.

The legacy wrapper is structural only. It must not assign card backgrounds, shadows or border radii to every direct child; each page stylesheet decides which elements are panels, grids, headers or transparent layout containers. Each module has one page-owned stylesheet; former layout/shared/legacy split files for Students, Courses and Offline Requests have been consolidated.

The messages inbox and management-feedback inbox are separate modules. Their root classes are `.admin-messages-page` and `.admin-management-contact-page`; they must not share a page-root selector because both stylesheets are part of the same application.

### Shared compatibility layers

- `AdminLegacy.css`: compatibility layer for legacy page wrappers, inline-styled markup and cross-module historical cascade rules. Do not add new page designs here. Retire rules only after the affected module has been migrated and verified.

## Separate authenticated portals

- `src/styles/StudentDesignSystem.css` belongs to `UserDashboard.tsx` and is loaded by the student portal itself.
- `src/styles/CounselorDesignSystem.css` belongs to `CounselorPortal.tsx` and is loaded by the counselor portal itself.
- Portal-specific selectors must not be placed in the admin shell stylesheet.

## Module styles

All admin module-owned styles live under `src/styles/admin/pages/`.

- `Dashboard.css`: dashboard composition and its approved visual treatment.
- `ManageAdmins.css`: manager-account workspace, permission picker and admin rows.
- `ManageCourses.css`: complete course-management module stylesheet, including layout and approved surface treatment.
- `ManageStudents.css`: complete student-management module stylesheet, including layout and approved surface treatment.
- `ManageMockExams.css`: mock-exam module layout and controls.
- `ManageRegistrations.css`: registration, payment and refund workspace.
- `ManageOfflineRequests.css`: complete offline-request module stylesheet; former legacy and final styles are consolidated in their original cascade order.
- `ManageCounseling.css`, `ManageMessages.css`, `ManageNotifications.css`, `ManageManagementContact.css`, and `AuditLogs.css`: module-specific presentation.

## Rules for future changes

1. Change a shared color, surface, shadow, radius, typography value or common component in `core/` only.
2. Keep module-specific grids, ordering, spacing and responsive composition in that module's page stylesheet.
3. Do not duplicate shared component appearance in page files. Use shared tokens and shared patterns.
4. Do not introduce new hard-coded brand colors or page-local shadow/radius systems.
5. Preserve semantic status colors (success, warning, error) through shared semantic tokens rather than arbitrary page palettes.
6. Historical module-specific color literals and repeated compatibility overrides are migration debt, not patterns to copy. Preserve their exact appearance during structural refactors; promote shared semantics to core tokens, and retire legacy values only after light/dark and responsive visual verification.
7. Do not delete compatibility selectors based on a text search alone. Confirm JSX usage and test both themes and responsive breakpoints.
8. Dashboard and Manage Admins remain the visual baselines; other modules should align to their visual language without copying their workflows or layouts.

## Migration status

The central tokens, theme, common component patterns and shell layout have been separated. Semantic content-surface aliases are defined centrally, and the student/course modules consume those tokens rather than referencing undefined variables. Student and counselor portal rules remain in their own entry points. Page stylesheets are imported by their owning page components after the shared shell layers. The legacy wrapper no longer assigns card surfaces to every first-level child, leaving panel ownership to each module. The messages and management-feedback inboxes now have distinct page-root classes to prevent their global stylesheets from colliding. Page-owned rules have been removed from the former AdminDesignSystem.css entry point and relocated to their respective module stylesheets; shell rules now live in AdminLayout.css and shared compatibility rules in AdminLegacy.css. Student, course and offline-request split stylesheets have been consolidated into one stylesheet per module. Historical color literals and repeated compatibility overrides remain in several legacy modules; they are intentionally retained until visual parity can be verified.

Historical cross-module cascade rules remain in the shared compatibility layers intentionally. They must be removed only as their target modules are verified against the central system. No business logic, API behavior, permissions, data models or workflows are changed by this CSS refactor.
