# Refactoring Plan - Task #21

**Date**: 2026-02-25  
**Branch**: `feature/HU-020-migrate-to-tailwind`  
**Task**: #21 - Code Review & Refactoring

## Overview

This document outlines the refactoring opportunities identified during code review of the TailwindCSS migration. The goal is to extract common patterns into reusable utility classes to reduce code duplication and improve maintainability.

---

## 1. Common Patterns Identified

### 1.1 Button Patterns (10+ occurrences)

**Locations**:
- `header.component.ts` - icon buttons for notifications, theme, profile
- `text-filter-input.component.ts` - clear button
- `semantic-search.component.ts` - clear button
- `filter-panel.component.ts` - clear filters button
- `paginator.component.ts` - load more button
- `book-list-page.component.ts` - filter toggle, action buttons

**Common styles**:
```scss
// Icon button pattern
display: inline-flex;
align-items: center;
justify-content: center;
width: 40px;
height: 40px;
border: none;
border-radius: 0.5rem;
background-color: transparent;
cursor: pointer;
transition: all 150ms ease;

// Clear button pattern (positioned absolute)
position: absolute;
right: 0.5rem;
padding: 0.25rem;
background: transparent;
border: none;
border-radius: 0.25rem;
cursor: pointer;
```

**Proposed utilities** (Added to `styles.scss`):
- `.btn-base` - Base button styles
- `.btn-primary` - Primary filled button
- `.btn-secondary` - Secondary outlined button
- `.btn-icon` - Icon-only button (square)
- `.btn-clear` - Clear button (for inputs, positioned absolute)

---

### 1.2 Input Patterns (8+ occurrences)

**Locations**:
- `text-filter-input.component.ts` - text input
- `semantic-search.component.ts` - textarea
- `paginator.component.ts` - select dropdown
- `header.component.ts` - search input
- `searchable-select.component.ts` - custom select (PrimeNG)
- `multi-select-chips.component.ts` - custom multi-select (PrimeNG)

**Common styles**:
```scss
width: 100%;
padding: 0.625rem 0.75rem;
font-size: 0.875rem;
color: #f1f5f9; /* slate-100 */
background-color: #1e293b; /* slate-800 */
border: 1px solid #334155; /* slate-700 */
border-radius: 0.5rem;
transition: all 0.15s ease;

&:focus {
  outline: none;
  border-color: #17a1cf; /* primary */
  box-shadow: 0 0 0 3px rgba(23, 161, 207, 0.1);
}

&:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Proposed utilities** (Added to `styles.scss`):
- `.input-base` - Base input styles (text, email, etc.)
- `.textarea-base` - Textarea with resize vertical
- `.select-base` - Select with custom arrow SVG

---

### 1.3 Label Patterns (6+ occurrences)

**Locations**:
- `text-filter-input.component.ts`
- `semantic-search.component.ts`
- `filter-panel.component.ts`
- `searchable-select.component.ts`
- `multi-select-chips.component.ts`

**Common styles**:
```scss
font-size: 0.75rem;
font-weight: 500-600;
color: #94a3b8; /* slate-400 */
text-transform: uppercase;
letter-spacing: 0.05em;
```

**Proposed utilities** (Added to `styles.scss`):
- `.label-base` - Base label styles
- `.label-filter` - Label with uppercase + tracking

---

### 1.4 Card Patterns (4+ occurrences)

**Locations**:
- `book-card.component.ts`
- Various dialog components
- Potential future card components

**Common styles**:
```scss
background-color: white / slate-800;
border: 1px solid slate-200 / slate-700;
border-radius: 0.5rem;
box-shadow: sm;
```

**Proposed utilities** (Added to `styles.scss`):
- `.card-base` - Base card styles
- `.card-elevated` - Card with stronger shadow
- `.card-hover` - Card with hover effects

---

### 1.5 Color Repetition

**Hardcoded colors repeated across components**:
- Primary: `#17a1cf` (30+ occurrences)
- Slate colors: `#94a3b8`, `#64748b`, `#334155`, `#1e293b`, `#0f172a`
- Transitions: `150ms`, `0.15s ease`, `all 0.15s ease`

**Solution**: These colors are already defined in CSS custom properties in `styles.scss`:
- `--primary`, `--primary-hover`, `--primary-active`
- `--slate-{50-950}`
- All components should use `var(--primary)` instead of hardcoded hex values

---

### 1.6 Dark Mode Repetition

**Pattern**:
```scss
[data-theme='dark'] .component {
  color: rgb(241 245 249);
  background: rgb(30 41 59);
}

[data-theme='light'] .component {
  color: rgb(30 41 59);
  background: rgb(255 255 255);
}
```

**Solution**: Use Tailwind's `dark:` modifier with utility classes instead:
```html
<div class="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800">
```

---

## 2. Refactoring Recommendations

### Priority 1: Extract Button Utilities ✅ DONE

**Status**: Utility classes added to `styles.scss` under `@layer components`

**Components to refactor**:
1. `header.component.ts` - Replace `.icon-button` with `.btn-icon`
2. `text-filter-input.component.ts` - Replace `.clear-button` with `.btn-clear`
3. `semantic-search.component.ts` - Replace `.semantic-search__clear-button` with `.btn-clear`
4. `filter-panel.component.ts` - Replace `.clear-filters-btn` with `.btn-secondary`
5. `paginator.component.ts` - Replace `.load-more-button` with `.btn-primary` (with border variant)

**Expected impact**:
- Reduce component styles by ~50-80 lines per component
- Consistent button behavior across app
- Easier to maintain hover/focus states

---

### Priority 2: Extract Input Utilities ✅ DONE

**Status**: Utility classes added to `styles.scss` under `@layer components`

**Components to refactor**:
1. `text-filter-input.component.ts` - Replace `.filter-input` with `.input-base`
2. `semantic-search.component.ts` - Replace `.semantic-search__textarea` with `.textarea-base`
3. `paginator.component.ts` - Replace `.paginator-select` with `.select-base`
4. `header.component.ts` - Replace `.search-input` with `.input-base`

**Expected impact**:
- Reduce component styles by ~40-60 lines per component
- Consistent input behavior (focus, hover, disabled)
- Easier dark mode management

---

### Priority 3: Extract Label Utilities ✅ DONE

**Status**: Utility classes added to `styles.scss` under `@layer components`

**Components to refactor**:
1. `text-filter-input.component.ts` - Replace `.filter-label` with `.label-filter`
2. `semantic-search.component.ts` - Replace `.semantic-search__label` with `.label-filter`
3. `filter-panel.component.ts` - Replace `.filter-section__title` with `.label-filter`

**Expected impact**:
- Reduce component styles by ~10-15 lines per component
- Consistent label appearance

---

### Priority 4: Replace Hardcoded Colors

**Components to refactor**:
- All components using hardcoded `#17a1cf` → `var(--primary)`
- All components using hardcoded slate colors → CSS custom properties or Tailwind classes

**Example**:
```scss
// Before
color: #17a1cf;
background-color: #1e293b;

// After
color: var(--primary);
background-color: var(--slate-800);

// Or with Tailwind
@apply text-primary bg-slate-800;
```

**Expected impact**:
- Easier theme customization
- Single source of truth for colors

---

### Priority 5: Optimize CSS Budget Warnings (Optional)

**Files over budget**:
1. `book-list-page.component.ts` - 5.25 kB (+1.25 kB over 4 kB budget)
2. `multi-select-chips.component.ts` - 4.73 kB (+732 bytes over 4 kB budget)

**Strategy**:
1. Use new utility classes to reduce inline styles
2. Extract repeated dark mode selectors
3. Use `@apply` to compress Tailwind utilities
4. Remove duplicate transition declarations

**Expected impact**:
- Reduce file sizes by 15-25%
- Potentially meet budget requirements

---

## 3. Implementation Steps

### Step 1: Add Utility Classes to `styles.scss` ✅ COMPLETED

**Status**: Done (2026-02-25)

**Added utilities**:
- Button utilities: `.btn-base`, `.btn-primary`, `.btn-secondary`, `.btn-icon`, `.btn-clear`
- Input utilities: `.input-base`, `.textarea-base`, `.select-base`
- Label utilities: `.label-base`, `.label-filter`
- Card utilities: `.card-base`, `.card-elevated`, `.card-hover`
- Divider utilities: `.divider-horizontal`, `.divider-vertical`
- Icon utilities: `.icon-sm`, `.icon-base`, `.icon-md`, `.icon-lg`
- Loading utilities: `.spinner`

**Verification**:
```bash
docker exec library-web-client npm run build  # ✅ Success
docker exec library-web-client npm run lint   # ✅ No errors
```

---

### Step 2: Refactor Components to Use Utilities (NEXT)

**Order of refactoring** (lowest risk first):

1. **Simple components** (low risk, high impact):
   - `text-filter-input.component.ts` - Use `.input-base`, `.label-filter`, `.btn-clear`
   - `semantic-search.component.ts` - Use `.textarea-base`, `.label-filter`, `.btn-clear`

2. **Medium complexity**:
   - `filter-panel.component.ts` - Use `.btn-secondary`, `.label-filter`, `.divider-horizontal`
   - `paginator.component.ts` - Use `.select-base`, `.btn-primary`

3. **Complex components** (higher risk):
   - `header.component.ts` - Use `.btn-icon`, `.input-base`
   - `book-list-page.component.ts` - Use button utilities, optimize for budget

---

### Step 3: Verify Visual Consistency

**Testing checklist**:
- [ ] Button hover states work correctly
- [ ] Input focus rings appear correctly
- [ ] Dark mode switches properly
- [ ] Responsive behavior maintained
- [ ] Accessibility unchanged (focus-visible, ARIA)

**Commands**:
```bash
# Visual verification
curl http://localhost:4200  # Check app loads

# Automated tests
docker exec library-web-client npm test  # Should still pass 342/349

# Build verification
docker exec library-web-client npm run build  # Should succeed
```

---

### Step 4: Measure Impact

**Metrics to track**:
1. **Lines of code reduced** per component
2. **CSS bundle size change** (check build output)
3. **Budget warnings** (did they improve?)
4. **Build time** (should be similar or faster)

**Expected results**:
- Reduce component styles by 30-50%
- Reduce total CSS by 10-15%
- Potentially fix budget warnings

---

## 4. Code Quality Improvements (Future)

### Additional Opportunities

1. **Extract TypeScript Utilities**:
   - Debounce logic (repeated in `text-filter-input` and `semantic-search`)
   - Icon rendering helpers
   - Form validation utilities

2. **Add JSDoc Comments**:
   - Document public APIs of components
   - Add `@param` and `@returns` for complex methods

3. **Extract Magic Numbers**:
   - `300` (debounce ms) → `DEBOUNCE_DEFAULT_MS`
   - `25`, `50`, `100` (page sizes) → `PAGE_SIZE_OPTIONS`
   - Color values → use CSS custom properties

4. **Simplify Complex Conditionals**:
   - `book-list-page.component.ts` has nested conditions for mobile/desktop
   - Extract to computed signals or helper methods

---

## 5. Success Criteria

**Task #21 is considered complete when**:
- [x] Common Tailwind patterns extracted to utility classes in `styles.scss`
- [ ] At least 5 components refactored to use new utilities
- [ ] Build still successful (no errors)
- [ ] ESLint still clean (0 errors)
- [ ] Tests still passing (342/349)
- [ ] Visual appearance unchanged (no regressions)
- [ ] CSS budget warnings reduced (optional but nice-to-have)
- [ ] Documentation updated (this file)
- [ ] Committed with conventional commits
- [ ] PR created for review

**Current Progress**: 20% complete (Step 1/5 done)

---

## 6. Next Actions

**Immediate next steps**:
1. Refactor `text-filter-input.component.ts` to use new utilities
2. Refactor `semantic-search.component.ts` to use new utilities
3. Test visual appearance in browser
4. Commit changes with message: `refactor: extract common input utilities`
5. Continue with remaining components

**Estimated time remaining**: ~2-2.5 hours

---

## 7. Risk Assessment

### Low Risk
- Button utility extraction (well-tested pattern)
- Label utility extraction (purely visual)

### Medium Risk
- Input utility extraction (need to test focus states carefully)
- Dark mode changes (need to verify both themes)

### High Risk
- Refactoring `book-list-page.component.ts` (large file, complex layout)
- CSS budget optimization (might require significant changes)

**Mitigation**:
- Test after each component refactoring
- Use Git commits to create safe rollback points
- Visual verification checklist after changes

---

## 8. Appendix: File Locations

### Global Styles
```
apps/web-client/src/styles.scss (main entry point - utilities added here)
apps/web-client/src/styles/_variables.scss (design tokens)
```

### Components to Refactor
```
apps/web-client/src/app/catalog/components/filters/
  ├── text-filter-input/text-filter-input.component.ts (205 lines)
  ├── semantic-search/semantic-search.component.ts (256 lines)
  ├── filter-panel/filter-panel.component.ts (435 lines)
  ├── searchable-select/searchable-select.component.ts
  └── multi-select-chips/multi-select-chips.component.ts (4.73 kB - over budget)

apps/web-client/src/app/catalog/components/table/
  ├── paginator/paginator.component.ts (244 lines)
  ├── book-table/book-table.component.ts
  └── book-card/book-card.component.ts

apps/web-client/src/app/catalog/pages/
  └── book-list/book-list-page.component.ts (5.25 kB - over budget)

apps/web-client/src/app/layout/
  └── header/header.component.ts (217 lines)
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-25  
**Author**: AI Coding Agent (Task #21)
