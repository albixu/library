# Design Doc: Migration from Angular Material to Native HTML + TailwindCSS

**Date**: February 24, 2026  
**Author**: Development Team  
**Status**: Approved  
**Scope**: Web Client - Book List Page (HU-015)

---

## 1. Context & Problem Statement

### Current State

The web client (Angular 21.2) currently uses **Angular Material** as the primary UI framework. While Material provides a robust component library, we're facing significant challenges in aligning our UI with the approved Stitch/Figma designs.

**Key Issues:**
- **Design Misalignment**: Angular Material enforces its own design system (Material Design 3), which conflicts with our custom Stitch designs
- **Style Override Hell**: Achieving pixel-perfect alignment requires excessive use of `::ng-deep`, `!important`, and complex CSS specificity battles
- **Limited Control**: Material's opinionated styling makes it difficult to implement custom designs without fighting the framework
- **Bundle Size**: Material adds significant weight (~500KB+) for features we're not fully utilizing
- **Maintenance Overhead**: Updates to Material can break our custom overrides

### Design Requirements

Our approved designs (Stitch/Figma) specify:
- Custom color palette (primary: `#17a1cf`, dark background: `#111d21`)
- Custom spacing and typography (Inter font family)
- Specific component styling that differs from Material Design guidelines
- Precise dark/light mode implementations

### The Problem

We cannot achieve pixel-perfect alignment with Stitch designs while using Angular Material without:
1. Fighting against Material's default styles constantly
2. Creating fragile CSS overrides that break on updates
3. Maintaining two parallel design systems (Material + Custom)

---

## 2. Decision Drivers

### Technical Drivers
- **Design Fidelity**: Must match Stitch/Figma designs exactly (pixel-perfect)
- **Maintainability**: Reduce CSS complexity and override fragility
- **Performance**: Reduce bundle size and improve load times
- **Developer Experience**: Simplify component development
- **Future-Proofing**: Avoid framework lock-in

### Business Drivers
- **Brand Consistency**: Our designs define our visual identity
- **Design Flexibility**: Need full control over UI components
- **Development Speed**: Less time fighting frameworks = more features
- **Quality**: Pixel-perfect implementation shows attention to detail

---

## 3. Considered Options

### Option 1: Keep Angular Material + Deep Overrides ❌

**Approach**: Continue using Material but override everything with `::ng-deep` and `!important`.

**Pros:**
- No migration needed
- Keep existing component logic
- Material's accessibility features

**Cons:**
- Fragile CSS that breaks on Material updates
- Constant battles with specificity
- Large bundle size for minimal benefit
- Two competing design systems
- Poor maintainability
- Still won't achieve pixel-perfect alignment

**Verdict**: **REJECTED** - Not sustainable long-term

---

### Option 2: Hybrid Approach (Material for Complex, Custom for Simple) ❌

**Approach**: Keep Material for complex components (Dialog, Select, Sidenav) but use custom HTML for simple ones (Table, Buttons).

**Pros:**
- Gradual migration path
- Keep Material's overlay system
- Reduced migration effort

**Cons:**
- Still maintains two design systems
- Inconsistent developer experience
- Material components still need heavy overrides
- Doesn't solve the core problem
- Complex to maintain long-term

**Verdict**: **REJECTED** - Halfway solution that doesn't solve root issues

---

### Option 3: Full Migration to Native HTML + TailwindCSS ✅ **CHOSEN**

**Approach**: Replace Angular Material with native HTML elements styled with TailwindCSS utility classes, matching Stitch designs exactly.

**Pros:**
- ✅ **Pixel-perfect design control** - Full styling autonomy
- ✅ **Lighter bundle size** - Remove ~500KB+ of Material
- ✅ **Better maintainability** - Single source of truth (Stitch)
- ✅ **No framework lock-in** - Future-proof architecture
- ✅ **Faster development** - No override battles
- ✅ **Better performance** - Smaller CSS, faster rendering
- ✅ **Matches Stitch exactly** - Stitch uses Tailwind

**Cons:**
- ⚠️ Migration effort required (~2-3 days)
- ⚠️ Need to implement some components from scratch (modals, selects)
- ⚠️ All tests need updating (selector changes)
- ⚠️ Storybook stories need updating

**Mitigation:**
- Keep Angular CDK for overlay system (Dialog, Sidenav) - battle-tested
- Use lightweight libraries for complex components (ng-select, ngx-spinner)
- Radical migration approach (all at once) to avoid prolonged inconsistency

**Verdict**: **ACCEPTED** - Best long-term solution

---

## 4. Decision Outcome

### Chosen Solution: Full Migration to Native HTML + TailwindCSS

We will perform a **radical migration** (not incremental) to completely remove Angular Material and rebuild components using native HTML + TailwindCSS, matching Stitch designs exactly.

---

## 5. Technical Approach

### Technology Stack After Migration

| Category | Technology | Reason |
|----------|-----------|--------|
| **Styling Framework** | TailwindCSS 3.x | Matches Stitch, utility-first approach |
| **Angular Core** | Angular 21.2 | No change - core framework |
| **Forms** | Reactive Forms | No change - keep existing logic |
| **Overlay System** | Angular CDK (Overlay, Dialog) | Battle-tested, complex to reimplement |
| **Icons** | Material Symbols (Google Fonts CDN) | Matches Stitch exactly |
| **Tooltips** | Native `title` attribute | Simple, accessible |
| **Animations** | CSS transitions/animations | Tailwind built-in classes |
| **Spinners** | `ngx-spinner` or similar | Lightweight library |
| **Select with Search** | `ng-select` or `ngx-select-dropdown` | Complex component, proven solution |

### Components to Migrate

| Component | Current Implementation | New Implementation | Complexity |
|-----------|----------------------|-------------------|-----------|
| `book-table` | MatTable | Native `<table>` + Tailwind | 🔴 High |
| `paginator` | Custom + Material buttons | Native buttons + Tailwind | 🟡 Medium |
| `book-card` | Material Card + Ripple | Native card + CSS | 🟢 Low |
| `filter-panel` | Material Form Fields | Native inputs + Tailwind | 🟡 Medium |
| `text-filter-input` | MatFormField + MatInput | Native `<input>` + Tailwind | 🟡 Medium |
| `searchable-select` | MatSelect | `ng-select` library | 🟡 Medium |
| `multi-select-chips` | MatSelect + MatChips | `ng-select` + custom chips | 🔴 High |
| `semantic-search` | MatFormField + MatInput | Native `<textarea>` + Tailwind | 🟢 Low |
| `loading-overlay` | MatSpinner | `ngx-spinner` | 🟢 Low |
| `empty-state` | Material Icon + Button | Native elements + Tailwind | 🟢 Low |
| `send-to-kindle-dialog` | MatDialog + MatFormField | CDK Dialog + native inputs | 🟡 Medium |
| `level-badge` | Custom (Material colors) | Custom (Tailwind) | 🟢 Low |
| `category-chips` | Custom (Material Tooltip) | Custom (native tooltip) | 🟢 Low |
| `format-icon` | MatIcon + MatTooltip | Material Symbols + native tooltip | 🟢 Low |
| `language-flag` | Custom (Material Tooltip) | Custom (native tooltip) | 🟢 Low |
| `truncated-text` | Custom (MatTooltip) | Custom (native tooltip) | 🟢 Low |
| `header` | Material Icon + Button | Material Symbols + native button | 🟢 Low |
| `theme-toggle` | Material Icon + Button | Material Symbols + native button | 🟢 Low |
| `book-list-page` | MatSidenav + Material | CDK Sidenav + native elements | 🟡 Medium |

**Total Components**: 18  
**Total Files to Update**: ~54 (components + tests + stories)

---

## 6. Migration Strategy

### Approach: Radical Migration

We will perform a **complete migration in one go** rather than incremental.

**Rationale:**
- Project is still in development (not in production)
- Avoids prolonged inconsistent state
- Faster overall completion (2-3 days vs weeks)
- Easier to test as a complete unit
- Single PR per task for focused review

### Workflow

```
main
  └── dev
       └── feature/HU-020-migrate-to-tailwind (history branch)
            ├── task/HU-020-install-tailwind (PR #1 → review → merge)
            ├── task/HU-020-migrate-icons (PR #2 → review → merge)
            ├── task/HU-020-migrate-table (PR #3 → review → merge)
            ├── task/HU-020-migrate-filters (PR #4 → review → merge)
            └── ... (continue with remaining tasks)
```

**Key Difference from AGENTS.md:**
- Each task creates a **PR to the history branch** (not direct merge)
- Manual review + approval required before continuing
- Ensures quality control at each step

---

## 7. TailwindCSS Configuration

### Colors (from Stitch)

```javascript
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#17a1cf',
        'background-light': '#f6f7f8',
        'background-dark': '#111d21',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
    },
  },
}
```

### Design Tokens

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| Primary | `#17a1cf` | `#17a1cf` |
| Background | `#f6f7f8` | `#111d21` |
| Container | `white` | `#0F172A` (slate-900) |
| Border | `#e5e7eb` | `#1E293B` (slate-800) |
| Text Primary | `#0f172a` | `#f1f5f9` |
| Text Secondary | `#64748b` | `#94a3b8` |

---

## 8. Dependencies Changes

### To Remove

```json
{
  "@angular/material": "^21.1.5",  // REMOVE
  "@angular/cdk": "^21.1.5"        // KEEP (for overlays only)
}
```

### To Add

```json
{
  "tailwindcss": "^3.4.0",
  "ng-select": "^13.0.0",           // Select with search
  "ngx-spinner": "^17.0.0",         // Loading spinner
  "@ng-select/ng-select": "^13.0.0" // Alternative to ng-select
}
```

### Final Bundle Impact

**Before Migration:**
- Angular Material: ~500KB (gzipped)
- Total bundle: ~1.2MB

**After Migration (Estimated):**
- TailwindCSS (purged): ~20-40KB (gzipped)
- ng-select: ~30KB
- ngx-spinner: ~10KB
- Total bundle: ~700KB

**Savings: ~500KB (~40% reduction)**

---

## 9. Testing Strategy

### Test Updates Required

| Test Type | Count | Action |
|-----------|-------|--------|
| Unit Tests | ~18 files | Update selectors (`.mat-*` → custom classes) |
| Integration Tests | ~5 files | Update component interactions |
| E2E Tests (Playwright) | ~3 files | Update page object selectors |
| Storybook Stories | ~18 files | Rewrite stories for new components |

### Coverage Target

- **Unit Tests**: 80% minimum (maintain current level)
- **E2E Tests**: All critical user flows must pass

### Visual Regression Testing

Manual visual comparison against:
- `docs/web/designs/gestor_libros_-_dark_desktop/`
- `docs/web/designs/gestor_libros_-_light_desktop/`
- `docs/web/designs/gestor_libros_-_dark_mobile/`

---

## 10. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Tests break extensively** | High | High | Update tests task-by-task, maintain coverage |
| **Complex components (select, modal) harder than expected** | Medium | Medium | Use proven libraries (ng-select, CDK) |
| **Design drift from Stitch** | High | Low | Visual review at each task, reference designs |
| **Performance regression** | Medium | Low | Monitor bundle size, lighthouse scores |
| **Accessibility issues** | High | Medium | Use semantic HTML, test with screen readers |
| **Timeline overrun** | Low | Medium | Radical approach, focused tasks, no scope creep |

---

## 11. Success Metrics

### Functional Metrics
- ✅ All existing features work identically
- ✅ All tests pass (unit + E2E)
- ✅ 80%+ test coverage maintained

### Design Metrics
- ✅ Pixel-perfect match with Stitch designs (dark desktop)
- ✅ Correct light mode implementation
- ✅ Responsive mobile design matches Stitch

### Performance Metrics
- ✅ Bundle size reduced by 40%+ (~500KB savings)
- ✅ Lighthouse score > 90 (performance)
- ✅ First Contentful Paint < 1.5s

### Developer Experience
- ✅ No more `::ng-deep` or `!important` hacks
- ✅ Storybook documentation updated
- ✅ Design doc + user story complete

---

## 12. Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Setup (Tailwind, fonts, icons) | 0.5 day | Install deps, configure Tailwind |
| Simple components | 0.5 day | Badges, icons, tooltips, empty states |
| Table & pagination | 0.5 day | Rewrite table, paginator |
| Filters | 0.5 day | All filter components |
| Complex components | 0.5 day | Modal, select, drawer |
| Tests & Storybook | 0.5 day | Update all tests and stories |
| **Total** | **2-3 days** | **Aggressive timeline** |

---

## 13. Rollback Plan

If critical issues arise:

1. **Revert PR**: History branch can be abandoned
2. **Fix forward**: Prefer fixing issues over reverting
3. **Hybrid fallback**: Temporarily keep Material for problematic components

**Note**: Given radical approach, rollback is straightforward (don't merge to `dev`).

---

## 14. Future Considerations

### Post-Migration
- Consider migrating detail page (out of scope for HU-020)
- Evaluate removing Angular CDK entirely (custom overlay implementation)
- Consider design system documentation (Storybook as living style guide)

### Long-term
- Establish Tailwind best practices guide
- Create reusable Tailwind component library
- Automate visual regression testing

---

## 15. References

- **Stitch Designs**: `docs/web/designs/gestor_libros_-_dark_desktop/`
- **Figma Exports**: `docs/web/designs/figma/`
- **Current Issues**: `docs/web/designs/errors/`
- **User Story**: `docs/user_stories/17-hu-020-migrate-to-tailwind.md` (to be created)
- **Original Design Doc**: `docs/design_docs/03-web-client-design.md`

---

## 16. Approval

- **Proposed**: February 24, 2026
- **Reviewed**: February 24, 2026
- **Approved**: February 24, 2026
- **Status**: ✅ **APPROVED - Ready for Implementation**

---

## Appendix A: Example Component Migration

### Before (Angular Material)

```typescript
@Component({
  template: `
    <mat-form-field appearance="outline">
      <mat-label>Search</mat-label>
      <input matInput [(ngModel)]="value" />
      <mat-icon matPrefix>search</mat-icon>
    </mat-form-field>
  `,
  imports: [MatFormFieldModule, MatInputModule, MatIconModule]
})
```

### After (Native + Tailwind)

```typescript
@Component({
  template: `
    <div class="relative">
      <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        search
      </span>
      <input
        [(ngModel)]="value"
        class="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary"
        placeholder="Search..."
      />
    </div>
  `,
  imports: [FormsModule]
})
```

**Result**: Same functionality, full design control, lighter bundle.

---

**End of Design Document**
