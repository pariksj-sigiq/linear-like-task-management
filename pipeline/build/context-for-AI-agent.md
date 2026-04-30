# Agent Skills — UI Fidelity & Clone Building

Lessons learned from building Zendesk + Linear clones. Follow these when building any new app clone.

---

## 1. Browser Verification (Non-Negotiable)

- **Never claim something is fixed without checking it in the browser first.**
- Open the real app and the clone side-by-side in two browser tabs via Playwright MCP (`mcp__playwright__browser_tabs` with `action: "new"`).
- Screenshot both after every change. Compare visually before moving on.
- Use Playwright MCP (`mcp__playwright__browser_*`) — static screenshot comparison alone gets you to ~60% fidelity, never to 100%.
- Only mark a page as done when there are **zero** visible differences from the original at the documented interactive states (default, hover, focus, active, disabled).

### Canonical MCP call sequence (per page)

```
1. mcp__playwright__browser_tabs(action="select", index=<real-app-tab>)
2. mcp__playwright__browser_navigate(url="<real app route>")
3. mcp__playwright__browser_snapshot()   // accessibility tree, refs for every element
4. mcp__playwright__browser_take_screenshot(filename="spec/screenshots/<app>/<page>-default.png")
5. For each interactive element discovered in (3):
     a. mcp__playwright__browser_hover(target=<ref>) → screenshot <page>-<elem>-hover.png
     b. mcp__playwright__browser_press_key(key="Tab")  → screenshot <page>-<elem>-focus.png (if reachable)
     c. mcp__playwright__browser_click(target=<ref>)  → screenshot <page>-<elem>-active.png (if opens menu/modal)
6. Switch to clone tab, repeat steps 2-5 against localhost:3000.
7. Diff screenshot pairs; list every delta with hex / px / element path.
```

**Rule:** every hex claim, every hover-state claim, every "the menu has X items" claim must trace back to a saved PNG captured via step 4. Memory / inference is not acceptable.

---

## 2. Fidelity Loop (Per Page)

For every page, repeat this loop until 100% match:

1. Screenshot the real app (live, not a saved reference image)
2. Screenshot the clone
3. List every difference — layout, colors, spacing, missing elements, interactive states
4. Fix the code
5. Hot-reload and re-screenshot both
6. Repeat until the page matches

Do not proceed to the next page until the current one is fully resolved.

---

## 3. Interactive States to Always Verify

Static layout is not enough. Always check:

- Hover states on rows, buttons, nav items
- Dropdown menus (z-index, positioning, all items present)
- Active/selected nav item highlighting
- Form focus states
- Empty states (no data)
- Scroll behavior on long lists
- Open ticket tabs / tab bar behavior

---

## 4. Common UI Bugs to Watch For

These bugs consistently appear across clone builds:

| Bug | Fix |
|---|---|
| Dropdown bleeds through other panels | Use `position: fixed` with dynamic coordinates, not `position: absolute` |
| User menu items missing or wrong | Match every item from original, including dividers and submenus |
| Submit/action button in wrong component | Action bar must span full width as a separate bottom component, not inside center panel |
| Rounded corners missing on cards/panels | Check `border-radius` on detail/side panel components |
| Top margin misaligned | Sidebar brand mark height must match `--topbar-height` exactly |
| Missing border-bottom on topbar | Add `border-bottom: 1px solid var(--border-color)` to header |
| User avatar blank/missing icon | Always render a fallback initial letter or user icon inside the avatar circle |
| Public reply showing as internal | Check reply type toggle default value and submission payload |
| Tags wrong color/shape | Match exact background color, border-radius, font-size, and padding from original |

---

## 5. Layout Patterns (Applies to Most SaaS Apps)

- **Sidebar:** Icon-only rail (~52-56px wide), dark background, white icons, filled icon + background highlight for active state, logo at top, user avatar at bottom
- **Topbar:** ~46px tall, white, subtle bottom border/shadow, tab bar for open items, search + icons on the right
- **Content area:** Three-column layout (left nav tree + center list + right stats/detail panel)
- **Ticket/item cards:** Dense rows (36-40px), requester avatar + name | subject, status badge (colored square, not pill), relative timestamp + ID
- **Action bar:** Fixed bar at the bottom of the main panel — never inside a sub-component
- **Detail panel:** Right sidebar with white cards with borders, not flat text on gray background
- **Admin:** Separate layout with its own 240px white sidebar, different from the main icon rail

---

## 6. Design Token Priorities

Always extract and apply these first — they have the highest visual impact:

- Sidebar background color (usually dark teal, charcoal, or navy — not generic slate blue)
- Primary accent color (e.g., Zendesk blue `#1f73b7`, not Tailwind `#3b82f6`)
- Font family (usually system font stack, not Inter)
- Base font size (often 13px, not 14-16px)
- Border color and radius (usually 4px, not 8px)
- Status badge colors (specific per status: open/pending/solved/closed)

---

## 7. Data & Language Rules

- All dataset content must be in **English** — no localized strings in seed data or UI labels.
- Requester and user names must be realistic full names, not `User #39` or generic IDs.
- Timestamps must use real relative formats: `Yesterday 1:49 PM`, `Monday 7:23 AM` — not `43 min ago`.
- Ticket IDs must be visible in card views: `#1236`, `#1227`, etc.
- Every clickable element must navigate somewhere — no dead UI. If username is shown, clicking it goes to the user page.

---

## 8. Linear-Specific Fidelity Bar

Linear is keyboard-first, dense, and has a specific aesthetic that's easy to miss if you copy generic SaaS conventions.

### Design tokens (sample from Linear screenshots — do NOT guess)

- **Theme:** light is default (`#ffffff` canvas, `#f4f5f8` panel); dark mode uses near-black (`#08090a`-ish). Sample actual hex from your captured PNGs before committing tokens.
- **Accent:** Linear purple (`~#5e6ad2` for primary action / selected). Not Tailwind blue. Not Zendesk blue.
- **Font:** Inter Variable + `"SF Pro Display"` fallback. Base size **13px**, not 14px.
- **Row height:** issue rows are **~32px** with `padding: 0 12px`. Tight.
- **Sidebar:** ~220px wide, neutral/slightly-warm gray background, NOT a dark rail. Icon+label rows, not icon-only.
- **Borders:** 1px `rgba(0,0,0,0.07)` — near-invisible. Heavy 4px rounding is wrong; corners are 4-6px.
- **Status icons:** per-state SVG glyph (not colored pills). Todo = empty circle, In Progress = partial arc, In Review = green ring, Done = filled check, Canceled = gray X, Backlog = dashed circle. Copy SVG paths exactly — the arc angle matters.

### Linear layout quirks

- **Sidebar is NOT a dark rail.** Primary nav is labelled rows (Inbox, My issues, Workspace, Projects, Views, More, then team groups). Icon-only sidebar = wrong app.
- **Topbar is not generic.** It's a header inside the main panel with page title + star + filter/display/view-switch controls on the right. No separate full-width topbar.
- **Issue rows** = `priority icon | ID (e.g. ELT-21) | status icon | title | labels | assignee avatar | date`. All one line. Hover shows extra actions on the right.
- **Cmd+K (command palette)** is mandatory. Dim backdrop, centered modal, fuzzy search, grouped results.
- **Quick create (`c`)** opens modal on top of whatever page. Not a route.
- **Group headers** in issue list (In Review / In Progress / Todo / Backlog) have subtle gray bg + count + `+` on right.
- **Right-side date** on issue rows is relative but short (`Apr 29`, not `Apr 29, 2026`, not `43 min ago`).

### Linear-specific bugs to watch for

| Bug | Fix |
|---|---|
| Sidebar dark rail instead of labelled nav | Rebuild as ~220px labelled column with section headers |
| Status rendered as pill / badge | Replace with SVG status glyph; match Linear's exact 6 states |
| Rows too tall / airy | Set row height 32px, font 13px, tighten padding |
| Accent color blue instead of purple | Swap to `#5e6ad2` (confirm exact hex from screenshot) |
| Issue IDs missing in list | ID goes between priority and status glyph, always visible |
| No cmd+K palette | Implement `Cmd+K` global shortcut opening `<CommandPalette/>` |
| Quick create is a route | Must be modal triggered by `c` from any page |
| Group headers absent | Add collapsible group rows grouped by status with count |

---

## 9. Verification Checklist Before Marking a Page Done

- [ ] Layout structure matches (columns, panels, widths)
- [ ] Colors match (sidebar, topbar, accents, status badges)
- [ ] Typography matches (font family, size, weight)
- [ ] All nav items present and labeled correctly
- [ ] Active state renders correctly
- [ ] Interactive elements work (dropdowns, menus, buttons, forms)
- [ ] Action bar is in the correct position
- [ ] No z-index stacking bugs
- [ ] Spacing and padding match (especially topbar margin, card padding)
- [ ] Empty states handled
- [ ] No Portuguese, Spanish, or non-English strings anywhere in the UI
- [ ] User avatars render with fallback icon/initial
