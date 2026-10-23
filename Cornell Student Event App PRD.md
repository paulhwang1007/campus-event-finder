# PRD: Campus Event Discovery Prototype (v0.1)

> Working name: **"Swipe"**. This is a placeholder until the team settles on a name.
> Status: First-pass prototype to get a feel for the user flow. Visual design is intentionally minimal; a design brief will be applied later.

## 1. Problem

Belonging is one of the strongest predictors of whether students persist to graduation. In 2023, **28.7% of Cornell first- and second-year undergrads** said they often or very often felt "out of place." Cornell offers many events, but most are formal, professional, or project-based. They are also spread across many channels (CampusGroups, Instagram, GroupMe, Discord, flyers). Low-stakes, spontaneous hangouts are hard to find, especially for new students without existing connections.

## 2. Mission

A single platform where Cornell first- and second-year undergrads can quickly discover informal, spontaneous campus gatherings that match their interests. The goal is to help them build connections beyond class and pre-professional extracurriculars.

## 3. Target Users

| Persona | Description | Primary need |
|---|---|---|
| **Explorer** (primary) | First-year, second-year, or transfer student in their first months at Cornell; few connections | Find low-commitment things to do that match their interests, without having to know anyone first |
| **Host** | Any verified student who wants people for a pickup game, movie night, sunset on the Slope, free headshots, etc. | Post quickly and reach people outside their own network |
| **Small club** | A new or lesser-known club or interest group | Post informal social events and get visibility with underclassmen |

Club posts and individual posts **look the same** to Explorers. The only difference is a small "Club" or "Student" label on the organizer line.

## 4. Goals and Success Metrics (prototype)

These map to the SMART objectives in the scope statement. The XX values are placeholders for the team to fill in.

| Goal | Metric (measured in usability testing) |
|---|---|
| Fast, interest-matched discovery | ≥XX% of XX participants find an event matching their interests in < XX seconds |
| Easy hosting | ≥XX% complete the event-creation flow without assistance |
| Visibility for small clubs | Participants discover at least one club they did not previously know about in one session |
| Complete prototype | XX sample events across XX interest categories, with all included features demonstrable |

**Non-goal for the prototype:** measuring real attendance or long-term belonging. The prototype can't establish these, as noted in the scope constraints.

## 5. Scope

### In scope (v0.1)

| # | Feature | Priority |
|---|---|---|
| F1 | **Onboarding and interest selection**: simulated NetID verification, basic profile, pick interests | P0 |
| F2 | **Discovery feed**: swipe cards (right = interested, left = pass), upcoming and ongoing events, filter by category, includes events outside selected interests | P0 |
| F3 | **Event details**: consistent format (description, time, location, category, capacity, accessibility, participation details), organizer updates | P0 |
| F4 | **Event creation**: students and clubs post informal events, with a policy reminder | P0 |
| F5 | **Saved events**: revisit events you swiped right on | P0 |
| F6 | **Organizer updates**: host posts a change (time, location, note) that appears on the event and flags it for people who saved it. This is the "Text Blast" equivalent and is simulated | P0 |
| F7 | **Reporting**: flag an inappropriate or misleading listing (simulated) | P0 |
| F8 | **All events list** with basic keyword search over title and description | P1 |
| F9 | **Demo controls**: reset all data to the seed state between usability-test participants | P1 |

### Out of scope (from the scope statement)

- Real backend, live NetID authentication, real moderation, or real messaging
- Automated scraping from Instagram or CampusGroups
- Recommendation or ranking algorithms, friend networks, attendance stats, sharing to other apps
- Search filters beyond interest category (date, distance, etc.)
- Complex RSVP management and public attendee lists
- Formal recruitment and pre-professional programming
- Photos and videos of events
- Campus-wide launch

## 6. Functional Requirements

### F1 Onboarding
- FR1.1 The user enters a Cornell NetID (format: 2–3 letters followed by 1–5 digits, e.g. `abc123`). Validation is format-only, followed by a fake "verifying…" step that always succeeds.
- FR1.2 The user enters a display name and class year (First-year, Sophomore, Junior, Senior, Transfer).
- FR1.3 The user selects **at least one** interest category. Multiple selections are allowed.
- FR1.4 After onboarding, the user lands on the Discovery Feed. Onboarding is skipped on later visits.

### F2 Discovery Feed
- FR2.1 Shows one event card at a time with the title, category, time ("Happening now" or "Today 7 PM"), location name, organizer name with a Student/Club label, and spots left if capacity is set.
- FR2.2 Swipe right or tap ✓ to mark the event as **Interested**, which saves it. Swipe left or tap ✕ to **Pass**. Both buttons must work so the feed is usable without gestures.
- FR2.3 Only **upcoming or ongoing** events are shown. Past events never appear.
- FR2.4 Default order: events in the user's interests first, then other events. Within each group, events are sorted by start time. Events outside the user's interests get a small "Something new" tag.
- FR2.5 Filter chips for categories, with "All" as the default. Selecting a category shows only that category.
- FR2.6 Tapping a card opens the Event Details screen.
- FR2.7 Events the user has already swiped on, created, or reported are not shown again.
- FR2.8 When there are no cards left, show an empty state with links to "View saved" and "Reset passes", and a prompt to post an event.
- FR2.9 Undo the last swipe (single level). P1.

### F3 Event Details
- FR3.1 Every event shows these fields in the same order: title, category, organizer (name and Student/Club label), date and time, location, description, participation details (what to bring and skill level), capacity, accessibility info.
- FR3.2 The exact location is shown only to verified users. In the prototype, every onboarded user counts as verified. This placement shows where the restriction would live.
- FR3.3 An **Updates** section lists organizer updates, newest first, with timestamps.
- FR3.4 Actions: Interested/Saved toggle, Report. If the current user is the organizer, Post update and Cancel event are also shown.

### F4 Event Creation
- FR4.1 Required fields: title, category, description, start date and time, end time, location name. Optional fields: location note (e.g., "by the big tree"), capacity (number or "No limit"), accessibility info, participation details.
- FR4.2 "Posting as" lets the user pick between themselves (Student) or a club. Club name is free text in the prototype.
- FR4.3 The user must check a box acknowledging Cornell's space reservation and conduct policies before posting.
- FR4.4 Validation: start time must be in the future or within the last hour (to allow "happening now" posts). End time must be after start time. Title must be 60 characters or fewer and description 500 characters or fewer.
- FR4.5 After posting, open the new event's details page. The event appears in other users' feeds; the creator never sees their own event in their feed.
- FR4.6 A **My Events** list shows events the user has hosted.

### F5 Saved
- FR5.1 Lists events the user marked Interested, split into Upcoming and Past.
- FR5.2 Events with an unread organizer update show a "New update" badge until the user opens them.
- FR5.3 The user can remove an event from Saved.

### F6 Organizer Updates
- FR6.1 The organizer can post an update with a type (Time change, Location change, General note) and a message of 280 characters or fewer.
- FR6.2 A time or location change also updates the event's fields. The update message records the old and new values.
- FR6.3 Users who saved the event see the badge described in FR5.2. No real notifications are sent.

### F7 Reporting
- FR7.1 Report reasons: Inappropriate, Misleading or spam, Unsafe, Not a Cornell student event, Other (with an optional note).
- FR7.2 After submitting, show a confirmation and hide the event from the reporter's feed and lists. Store the report locally. No real moderation happens.

### F8 All Events and Search (P1)
- FR8.1 A scrollable list of all upcoming and ongoing events, grouped by day.
- FR8.2 Keyword search on title and description, combinable with a category chip.

### F9 Demo Controls (P1)
- FR9.1 Profile screen has a **Reset demo** button that clears all stored data and reloads the seed data.

## 7. Content: Interest Categories

1. 🏀 Sports & Active
2. 🎨 Arts & Creative
3. 🍕 Food & Hangouts
4. 🌄 Outdoors
5. 🎮 Games & Movies
6. 📚 Study & Chill
7. 📸 Student Services (free headshots, haircuts, tutoring, etc.)

## 8. Seed Data Requirements

- 24–30 events across all 7 categories, with at least 3 per category
- At least 5 events posted by **3–5 small or new clubs**. The rest are posted by individual students.
- At least 3 events "happening now" and the rest spread over the next 7 days. Times are **relative to when the app loads**, so the demo never goes stale.
- At least 2 seeded events already contain organizer updates.
- Locations are recognizable Cornell spots, such as Libe Slope, Arts Quad, Helen Newman, Noyes, Duffield Atrium, Beebe Lake, Appel Commons, Willard Straight, Teagle, and Mann Library.

## 9. Usability Test Tasks (core 3)

1. "Find something to do tonight that matches your interests and save it." (timed)
2. "Post a pickup soccer game for Saturday afternoon on the Arts Quad for 10 people."
3. "Find the event you saved earlier and check whether anything about it has changed."

## 10. Open Questions

- Should the swipe directions mean anything beyond Interested and Pass, such as "super-interested"? Defaulting to no.
- Should passed events ever come back? Currently they only return via "Reset passes."
- What is the final app name?
- Should "Student Services" be its own category or a tag?
