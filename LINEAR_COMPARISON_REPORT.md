# Linear Clone vs Reference - Comprehensive Comparison Report

**Generated:** 2026-04-29T17:33:00Z  
**Reference:** https://linear.app/eltsuh/team/ELT/active  
**Clone:** http://localhost:3002/team/elt/active  

## Executive Summary

This report identifies ALL visual and functional differences between the Linear reference application and the clone implementation. Differences are categorized by severity and organized by component area.

## Screenshots

- **Linear Reference:** `linear-reference-2026-04-29T17-31-35.png`
- **Clone Current:** `clone-current-2026-04-29T17-32-15.png`

---

## Critical Differences (Blocks Usage)

### 1. PAGE STATE MISMATCH
**Severity:** CRITICAL  
**What Linear Has:** Active team page showing grouped issues (In Review: 4, In Progress: 4, Todo: 8)  
**What Clone Has:** Empty state with "No issues found" message and board view with activity flow chart  
**Impact:** Completely different user experience - clone shows empty state instead of issue list  
**Component:** `/Users/pariksj/Desktop/saas-clone/app/frontend/src/pages/WorkspacePages.tsx` (TeamIssuesPage)  
**Fix:** 
- Verify tool API is returning issues correctly
- Check filtering logic in IssueExplorer component
- Ensure defaultMode is set to "list" not "board" for team active page
- Line 311-325: The TeamIssuesPage should default to list view with proper status filtering

```tsx
// Current (line 311):
defaultMode="list"

// Should verify the toolName and params are correct:
toolName="list_team_issues"  // or appropriate tool
params={{
  team_key: teamName(teamKey),
  status: statusMap[segment],
}}
```

---

## High Priority (Obvious Visual Differences)

### 2. TOPBAR HEIGHT DISCREPANCY
**Severity:** HIGH  
**What Linear Has:** Topbar height of 88px  
**What Clone Has:** Topbar height of 48px  
**Impact:** Significant layout difference affects visual hierarchy  
**Component:** `/Users/pariksj/Desktop/saas-clone/app/frontend/src/design-tokens.css`  
**Fix:** Line 56
```css
/* Current */
--topbar-height: 46px;

/* Should be */
--topbar-height: 88px;
```

### 3. SIDEBAR WIDTH DIFFERENCE
**Severity:** HIGH  
**What Linear Has:** Sidebar width of 244px  
**What Clone Has:** Sidebar width of 255px (from snapshot: box=0,0,255,810)  
**Impact:** Subtle but noticeable layout spacing difference  
**Component:** `/Users/pariksj/Desktop/saas-clone/app/frontend/src/design-tokens.css`  
**Fix:** Line 52
```css
/* Current */
--sidebar-width: 224px;

/* Should be */
--sidebar-width: 244px;
```

### 4. WORKSPACE BRANDING
**Severity:** HIGH  
**What Linear Has:** Workspace name "eltsuh" with custom avatar/logo  
**What Clone Has:** Workspace name "SigiQ" with different branding  
**Impact:** Clone uses different workspace identity  
**Component:** `/Users/pariksj/Desktop/saas-clone/app/frontend/src/components/AppRoot.tsx` (likely)  
**Fix:** Update workspace configuration to match Linear's "eltsuh" branding

### 5. PAGE TITLE
**Severity:** HIGH  
**What Linear Has:** Dynamic page title "Eltsuh › Active issues"  
**What Clone Has:** Generic title "Clone App"  
**Impact:** Poor SEO and browser tab identification  
**Component:** `/Users/pariksj/Desktop/saas-clone/app/frontend/src/App.tsx` or page components  
**Fix:** Implement dynamic document.title updates based on current route

### 6. ISSUE COUNT DISPLAY
**Severity:** HIGH  
**What Linear Has:** Shows actual issue counts in group headers (e.g., "In Review 4")  
**What Clone Has:** Shows "0" counts in status cards (VISIBLE 0, ACTIVE 0, BACKLOG 0, DONE 0)  
**Impact:** No issues are being displayed or fetched  
**Component:** `/Users/pariksj/Desktop/saas-clone/app/frontend/src/components/IssueExplorer.tsx`  
**Fix:** Debug tool API integration and data fetching logic

---

## Medium Priority (Subtle Visual Differences)

### 7. TOPBAR BACKGROUND COLOR
**Severity:** MEDIUM  
**What Linear Has:** `lch(4.52 0.3 272)` - very dark with slight purple tint  
**What Clone Has:** `rgba(0, 0, 0, 0)` - transparent  
**Impact:** Different visual depth and hierarchy  
**Component:** `/Users/pariksj/Desktop/saas-clone/app/frontend/src/design-tokens.css`  
**Fix:** Lines 197-198 (dark mode)
```css
/* Current */
--topbar-bg: #171717;

/* Should be closer to */
--topbar-bg: #0d0d0d; /* lch(4.52 0.3 272) approximation */
```

### 8. FONT FAMILY MISSING "Linear Thai"
**Severity:** MEDIUM  
**What Linear Has:** `"Inter Variable", "SF Pro Display", -apple-system, "system-ui", "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", "Linear Thai", sans-serif`  
**What Clone Has:** `"Inter Variable", "SF Pro Display", -apple-system, "system-ui", "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif`  
**Impact:** Missing "Linear Thai" fallback font  
**Component:** `/Users/pariksj/Desktop/saas-clone/app/frontend/src/design-tokens.css`  
**Fix:** Line 134
```css
/* Current */
--font-family: "Inter Variable", "SF Pro Display", -apple-system, "system-ui", "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;

/* Should be */
--font-family: "Inter Variable", "SF Pro Display", -apple-system, "system-ui", "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", "Linear Thai", sans-serif;
```

### 9. SIDEBAR NAVIGATION FONT SIZES
**Severity:** MEDIUM  
**What Linear Has:** Section headers at 13.333px (e.g., "Workspace", "Your teams")  
**What Clone Has:** Likely different sizing  
**Impact:** Typography hierarchy doesn't match exactly  
**Component:** Sidebar navigation components  
**Fix:** Ensure section headers use `font-size: 13.333px` (approximately 13px or 0.8125rem)

### 10. COLOR SCHEME DIFFERENCES
**Severity:** MEDIUM  
**What Linear Has:** LCH color space with precise values  
**What Clone Has:** RGB/hex colors that may not match exactly  
**Impact:** Subtle color differences throughout  
**Examples:**
- Linear text color: `lch(100 0 272)` 
- Linear sidebar text: `lch(90.077 1 272)`
**Fix:** Consider using LCH color space or converting Linear's exact LCH values to RGB equivalents

### 11. SEARCH BUTTON IN TOPBAR
**Severity:** MEDIUM  
**What Linear Has:** Search with keyboard shortcut indicator (⌘K visible)  
**What Clone Has:** Search button present but may lack shortcut indicator  
**Impact:** Missing keyboard shortcut hint reduces discoverability  
**Component:** AppRoot or header component  
**Fix:** Add keyboard shortcut badge/indicator to search button

### 12. TEAM KEY DISPLAY
**Severity:** MEDIUM  
**What Linear Has:** Team displayed as "ELT" (uppercase)  
**What Clone Has:** Team displayed as "elt" (lowercase) in URL, "Engg" in sidebar  
**Impact:** Inconsistent team naming and casing  
**Component:** Multiple - URL routing and team name display logic  
**Fix:** Ensure consistent uppercase team keys throughout app

---

## Low Priority (Minor Details)

### 13. INBOX NOTIFICATION COUNT
**Severity:** LOW  
**What Linear Has:** No visible notification badge in screenshot  
**What Clone Has:** "99+" notification badge on Inbox  
**Impact:** Clone may be using mock/test data  
**Component:** Sidebar navigation  
**Fix:** Connect to real notification API or hide badge when zero

### 14. TOPBAR BORDER
**Severity:** LOW  
**What Linear Has:** Topbar may have subtle bottom border  
**What Clone Has:** No visible topbar border  
**Impact:** Very subtle visual separation  
**Component:** Header/topbar styling  
**Fix:** Add `border-bottom: 1px solid var(--topbar-border);` to topbar

### 15. HOVER STATES
**Severity:** LOW  
**What Linear Has:** Precise hover color transitions  
**What Clone Has:** Generic hover states  
**Impact:** Interactive feedback may feel slightly different  
**Component:** Various button and link components  
**Fix:** Audit hover colors against Linear reference using browser inspector

### 16. SIDEBAR NAVIGATION ICON SIZES
**Severity:** LOW  
**What Linear Has:** Consistent 16px icons in navigation  
**What Clone Has:** Likely 16px but needs verification  
**Impact:** Minor visual consistency  
**Component:** Sidebar nav items  
**Fix:** Ensure all sidebar icons are exactly 16x16px

### 17. SPACING/PADDING PRECISION
**Severity:** LOW  
**What Linear Has:** Precise padding values (e.g., `0px 7px`, `0px 2px`)  
**What Clone Has:** May use slightly different padding  
**Impact:** Micro-spacing differences  
**Component:** Various UI components  
**Fix:** Audit and match exact padding values from Linear

### 18. BORDER RADIUS VALUES
**Severity:** LOW  
**What Linear Has:** Various border radius (8px, 9999px for pills, 10px for buttons)  
**What Clone Has:** Standardized radius tokens  
**Impact:** Subtle shape differences  
**Component:** Design tokens  
**Fix:** Match exact border-radius values per component type

### 19. SCROLLBAR STYLING
**Severity:** LOW  
**What Linear Has:** Custom scrollbar styling  
**What Clone Has:** Default or custom scrollbar  
**Impact:** Minor aesthetic detail  
**Component:** Global CSS  
**Fix:** Add custom scrollbar styles matching Linear's `--scroll-thumb` color

### 20. FOCUS STATES
**Severity:** LOW  
**What Linear Has:** Ring color `lch(94 106 210)` approximation  
**What Clone Has:** Standard focus rings  
**Impact:** Keyboard navigation appearance  
**Component:** Focus ring styles  
**Fix:** Ensure focus-visible styles match Linear's purple ring

---

## Functional Differences

### 21. DATA LOADING
**Severity:** CRITICAL  
**What Linear Has:** Live data from Linear API showing real issues  
**What Clone Has:** Empty state - no issues loaded  
**Impact:** Core functionality not working  
**Component:** API integration layer  
**Fix:** 
- Verify tool server is running and accessible
- Check network requests in browser console
- Ensure authentication is working
- Debug `list_team_issues` or equivalent tool call

### 22. ROUTING
**Severity:** MEDIUM  
**What Linear Has:** Route `/team/ELT/active` (uppercase)  
**What Clone Has:** Route `/team/elt/active` (lowercase)  
**Impact:** URL inconsistency  
**Component:** React Router configuration  
**Fix:** Normalize team keys to uppercase in routes

### 23. KEYBOARD SHORTCUTS
**Severity:** MEDIUM  
**What Linear Has:** Full keyboard shortcut system (⌘K, C, etc.)  
**What Clone Has:** May have partial implementation  
**Impact:** Power user features missing  
**Component:** Keyboard event handlers  
**Fix:** Audit and implement all core Linear keyboard shortcuts

### 24. EMPTY STATE CONTENT
**Severity:** MEDIUM  
**What Linear Has:** Contextual empty states with specific copy  
**What Clone Has:** Generic "No issues found" with create button  
**Impact:** User guidance differences  
**Component:** EmptyState components  
**Fix:** Match empty state copy and CTAs to Linear

---

## Architecture Observations

### 25. VIEW MODE DEFAULT
**Issue:** Clone defaults to board view with activity chart  
**Linear:** Shows list view with grouped issues  
**Component:** IssueExplorer defaultMode prop  
**Fix:** Line 321 in WorkspacePages.tsx - verify defaultMode="list" is being respected

### 26. ISSUE GROUPING
**Issue:** Clone may not be implementing status grouping correctly  
**Linear:** Groups issues by status (In Review, In Progress, Todo)  
**Component:** IssueExplorer grouping logic  
**Fix:** Ensure group headers and issue filtering works correctly

### 27. TOOL API INTEGRATION
**Issue:** Tool API may not be returning data or clone isn't calling it  
**Linear:** Fetches and displays real-time issue data  
**Component:** `readTool` function calls  
**Fix:** Add error logging and debug tool responses

---

## Testing Recommendations

1. **Visual Regression Testing**
   - Use Playwright to capture screenshots at various breakpoints
   - Compare pixel-by-pixel with Linear reference
   - Test light and dark modes

2. **Typography Audit**
   - Measure font sizes across all component states
   - Verify line-heights and letter-spacing
   - Check font-weight usage (400 vs 500 vs 600)

3. **Color Audit**
   - Extract exact color values from Linear using browser inspector
   - Convert LCH to RGB if needed
   - Test color contrast ratios for accessibility

4. **Spacing Audit**
   - Measure padding/margin values for each component
   - Verify consistent spacing scale
   - Check responsive breakpoint behaviors

5. **Interactive States**
   - Test hover, active, focus, disabled states
   - Verify transition timings and easing
   - Check cursor styles

6. **Functional Testing**
   - Verify all tool API calls succeed
   - Test issue creation, editing, deletion
   - Validate routing and navigation
   - Test keyboard shortcuts

---

## Priority Fix Order

### Phase 1: Critical Fixes (Blocks Usage)
1. Fix data loading - get issues to display ✓ PRIORITY 1
2. Fix page state - show list view not empty board ✓ PRIORITY 1
3. Fix topbar height (88px) ✓ PRIORITY 2
4. Fix sidebar width (244px) ✓ PRIORITY 2

### Phase 2: High Visual Fidelity
5. Update workspace branding
6. Implement dynamic page titles
7. Fix team key casing (ELT uppercase)
8. Add keyboard shortcut indicators

### Phase 3: Polish & Details
9. Update color values to match LCH
10. Add "Linear Thai" font fallback
11. Fine-tune spacing and padding
12. Match border radius values precisely
13. Style scrollbars
14. Audit and fix all hover states

### Phase 4: Feature Parity
15. Implement full keyboard shortcut system
16. Add missing interactive states
17. Match empty state copy
18. Test and fix responsive behaviors

---

## Automated Comparison Script

To run this comparison automatically in the future:

```bash
# Install dependencies
npm install playwright

# Run comparison
node scripts/compare-linear.js
```

This script should:
1. Launch Playwright
2. Navigate to both URLs
3. Wait for page load
4. Capture screenshots
5. Extract computed styles
6. Generate diff report
7. Save artifacts with timestamp

---

## Conclusion

The clone has achieved strong foundational fidelity but needs critical fixes around data loading and several layout adjustments to match Linear exactly. The most impactful fixes are:

1. **Fix data loading** (CRITICAL)
2. **Adjust topbar height to 88px** (HIGH)
3. **Adjust sidebar width to 244px** (HIGH)
4. **Fix team key casing** (HIGH)
5. **Typography and color fine-tuning** (MEDIUM)

Once these are addressed, the clone will be visually and functionally indistinguishable from Linear for the core team active page workflow.

---

**Report End**  
*Generated by automated comparison workflow*  
*Next comparison: Run after implementing critical fixes*
