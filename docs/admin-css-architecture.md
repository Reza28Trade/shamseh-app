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
- `AdminTheme.css`: canonical light/dark values for the `--admin-*` surface variables. These values were moved unchanged from the former inline style object in `AdminLayout.tsx`.
- `AdminComponents.css`: shared admin page patterns and common visual treatments for headings, cards, stats, controls and tables.
- `AdminLayout.css`: shell, sidebar, mobile header and responsive layout rules formerly mixed into the large design-system stylesheet.

### Shared compatibility layers

- `AdminDesignSystem.css`: shared cross-module visual normalization and historical cascade rules that still need gradual consolidation. Do not add new module-specific layout rules here.
- `AdminLegacy.css`: compatibility layer for legacy page wrappers and inline-styled markup. Do not add new page designs here. Retire rules only after the affected module has been migrated and verified.

## Separate authenticated portals

- `src/styles/StudentDesignSystem.css` belongs to `UserDashboard.tsx` and is loaded by the student portal itself.
- `src/styles/CounselorDesignSystem.css` belongs to `CounselorPortal.tsx` and is loaded by the counselor portal itself.
- Portal-specific selectors must not be placed in the admin shell stylesheet.

## Module styles

All admin module-owned styles live under `src/styles/admin/pages/`.

- `Dashboard.css`: dashboard composition and its approved visual treatment.
- `ManageAdmins.css`: manager-account workspace, permission picker and admin rows.
- `ManageCourses.layout.css` and `ManageCourses.css`: course-specific layout and approved surface treatment.
- `ManageStudents.layout.css` and `ManageStudents.css`: student-specific layout and approved surface treatment.
- `ManageMockExams.css`: mock-exam module layout and controls.
- `ManageRegistrations.css`: registration, payment and refund workspace.
- `ManageOfflineRequests.css` and `ManageOfflineRequests.legacy.css`: offline-request module styling split by its former cascade origin.
- `ManageCounseling.css`, `ManageMessages.css`, `ManageNotifications.css`, `ManageManagementContact.css`, and `AuditLogs.css`: module-specific presentation.

## Rules for future changes

1. Change a shared color, surface, shadow, radius, typography value or common component in `core/` only.
2. Keep module-specific grids, ordering, spacing and responsive composition in that module's page stylesheet.
3. Do not duplicate shared component appearance in page files. Use shared tokens and shared patterns.
4. Do not introduce new hard-coded brand colors or page-local shadow/radius systems.
5. Preserve semantic status colors (success, warning, error) through shared semantic tokens rather than arbitrary page palettes.
6. Do not delete compatibility selectors based on a text search alone. Confirm JSX usage and test both themes and responsive breakpoints.
7. Dashboard and Manage Admins remain the visual baselines; other modules should align to their visual language without copying their workflows or layouts.

## Migration status

The central tokens, theme, common component patterns and shell layout have been separated. Student and counselor portal rules have also been removed from the admin-only stylesheet and returned to their own entry points. The clearly identifiable module-owned sections have been moved into page files, and the original root-level Courses, Students and Mock Exams stylesheets have been relocated into the module directory.

Historical cross-module cascade rules remain in the shared compatibility layers intentionally. They must be removed only as their target modules are verified against the central system. No business logic, API behavior, permissions, data models or workflows are changed by this CSS refactor.
