# Agent Skills — UI Fidelity & Clone Building

Lessons learned from building the Zendesk clone. Follow these when building any new app clone.

---

## 1. Browser Verification (Non-Negotiable)

- **Never claim something is fixed without checking it in the browser first.**
- Open the real app and the clone side-by-side in two browser tabs.
- Screenshot both after every change. Compare visually before moving on.
- Use live browser control (Cursor browser MCP) — static screenshot comparison alone gets you to ~60% fidelity, never to 100%.
- Only mark a page as done when there are **zero** visible differences from the original at the documented interactive states (default, hover, focus, active, disabled).

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

## 8. Verification Checklist Before Marking a Page Done

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
