# Implementation Plan: Campus Event Discovery Prototype (v0.1)

**For Claude Code:** read `PRD.md`, `TRD.md`, and `APP_FLOW.md` first. Build one phase at a time. After each phase, run `npm run build` and `npm test`, confirm the acceptance criteria, and stop for review before moving on. Keep visuals minimal and use only CSS variables from `tokens.css`, because a design brief will restyle everything later.

---

## Phase 0: Scaffold
- Create a Vite React-TS app and install `react-router-dom`, `zustand`, `framer-motion`, `date-fns`, and `vitest`.
- Set up the folder structure from TRD §2.
- Add `tokens.css` (grayscale palette, one accent color, spacing scale, radius, system font) and `global.css` (centered 430px phone column, box-sizing reset).
- Add a placeholder screen for each route, plus the `RequireUser` guard and `BottomNav`.

**Done when:** the app runs, every route renders its placeholder, nav switches tabs, and `/feed` redirects to `/welcome` when there is no user.

## Phase 1: Data Layer
- Write `types.ts` (TRD §3) and `categories.ts` (7 categories).
- Write `seedEvents.ts`: 24–30 events that meet the PRD §8 rules (relative times, 3 or more per category, at least 3 happening now, 3–5 clubs with 5 or more club events, at least 2 events with updates). Use realistic Cornell locations and casual student tone.
- Write `useAppStore.ts` with persist (versioned key `swipe-demo-v1`) and all actions in TRD §4.
- Write `selectors.ts`, `time.ts`, and `validation.ts`.
- Add unit tests covering feed ordering (interests first, ongoing first), filters, exclusion of saved, passed, reported, own, and past events, NetID regex, event-form validation, and `hasUnreadUpdate`.

**Done when:** tests pass, and seeding on an empty store produces valid events with no past events in the feed.

## Phase 2: Onboarding
- Build Welcome, Verify NetID (format validation and fake 1.2 s verify), Profile Setup, and Pick Interests (multi-select, at least 1 required, edit mode).
- `completeOnboarding` saves the user and the flow lands on `/feed`. Refreshing keeps the user logged in.

**Done when:** a new user completes onboarding in under 30 s, invalid NetIDs show inline errors, and Continue buttons disable correctly.

## Phase 3: Discovery Feed and Event Details (the core loop)
- Build the `EventCard` and `SwipeDeck` components (TRD §8): drag thresholds, ✓ and ✕ buttons, arrow keys, tap to open details, two-card stack, reduced-motion support.
- Build the Feed screen: category chips, a "Something new" tag on events outside the user's interests, a toast with Undo after saving, and the empty state with its 3 actions.
- Build the Event Details screen using `EventFieldList` with the fixed field order (APP_FLOW §2.6), `UpdateList`, the interest toggle, and a ⋯ menu with Report. Opening the screen marks updates as seen.

**Done when:** a user can swipe through the whole deck; saved and passed events don't reappear; filters work; Undo restores the last card; details show every field consistently; and tasks 1 and 3 from the test plan are fully completable.

## Phase 4: Create, Saved, Updates, and Reporting
- Build the Create Event form (APP_FLOW §2.9): Posting as Student or Club, all fields, capacity toggle, required policy checkbox, inline validation, scroll to the first error, and a discard confirmation. Posting navigates to the new event's details page.
- Build the Saved screen: Upcoming and Past tabs, "New update" and "Cancelled" badges, Remove action, empty state.
- Build the organizer tools on Event Details: Post Update modal (time, location, or note, with prefilled fields and auto-suggested messages) and Cancel event with confirmation.
- Build the Report modal: reasons and note, confirmation, event hidden afterward.
- Add My Events to Profile.

**Done when:** task 2 is completable without help; a posted event appears in My Events; posting a time update changes the event's time and adds an update entry; reported events disappear from the Feed, Saved, and Events screens.

## Phase 5: All Events, Search, and Demo Tools (P1)
- Build the All Events list grouped by day, with keyword search and category chips.
- Build the rest of Profile: edit interests, NetID and verified badge, and **Reset demo** (with confirmation, then clear storage, reseed, and go to `/welcome`).
- Add a "Show passed events again" action to the Feed empty state.

**Done when:** search finds events by words in the title or description; Reset demo returns the app to a clean seed state for the next test participant.

## Phase 6: Polish and QA
- Add basic accessibility: labels on all inputs, `aria-label`s on icon buttons, visible focus states, and sufficient contrast.
- Check the layout at 375px and 430px widths and on a desktop browser.
- Run through this manual QA checklist:
  - [ ] Fresh load goes to Welcome, and onboarding ends on the Feed
  - [ ] Refreshing keeps the user and their saved events
  - [ ] Swipe right, swipe left, ✓/✕ buttons, arrow keys, and Undo all work
  - [ ] Category filter, the empty state, and resetting passes work
  - [ ] Details field order is identical across 3 different events
  - [ ] Create: validation errors, a successful post, and the event appears in My Events (not in the creator's own Feed)
  - [ ] Post update: the event fields change, and a saved user sees the "New update" badge, which clears after opening
  - [ ] Cancel event: banner appears and the toggle is disabled
  - [ ] Report: the event is hidden everywhere for the reporter
  - [ ] Reset demo restores the seed state
  - [ ] `npm run build` succeeds with no TypeScript errors
- Write a README with setup, run, and deploy instructions (Vercel or Netlify static hosting) so teammates and test participants can open a link.

---

## Later (not part of v0.1)
- Apply the design brief by replacing `tokens.css` values and restyling components.
- Add a usability-test timing log (task start and end timestamps viewable on a hidden `/debug` page).
- Nice-to-haves from the PRD: photos and videos, sharing, friends, recommendation ranking, search filters, scraping.
- Real backend (Supabase or Firebase), real NetID SSO, a moderation queue, and push notifications for updates.

## Suggested First Prompt for Claude Code
> Read PRD.md, TRD.md, APP_FLOW.md, and IMPLEMENTATION_PLAN.md. Implement Phase 0 and Phase 1 only, then stop and summarize what you built, how to run it, and anything in the docs that was ambiguous.
