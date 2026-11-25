# Seed event photos

Each seeded event shows the photo at `seed/<name>.jpg` in the **event-photos** storage bucket.
Until a file exists, the app shows the category placeholder, so you can add photos gradually.

**To add photos:** Supabase → Storage → `event-photos` → create a folder named `seed` → upload files
with exactly these names. JPGs around 1600px wide work well. Use photos you took or have the rights to use.

| Event | File name |
|---|---|
| Pickup basketball run | `pickup-basketball-run.jpg` |
| Sunset pickup soccer | `sunset-pickup-soccer.jpg` |
| Disc golf casual round | `disc-golf-casual-round.jpg` |
| Climbing wall buddy session | `climbing-wall-buddy-session.jpg` |
| Open mic + sketch night | `open-mic-sketch-night.jpg` |
| Pottery drop-in | `pottery-drop-in.jpg` |
| Watercolor on the Slope | `watercolor-on-the-slope.jpg` |
| Zine-making hangout | `zine-making-hangout.jpg` |
| Study break pizza | `study-break-pizza.jpg` |
| Bagel run meetup | `bagel-run-meetup.jpg` |
| Wing night | `wing-night.jpg` |
| Boba and board games | `boba-and-board-games.jpg` |
| Beebe Lake sunset walk | `beebe-lake-sunset-walk.jpg` |
| Sunrise yoga on the Slope | `sunrise-yoga-on-the-slope.jpg` |
| Gorge trail hike | `gorge-trail-hike.jpg` |
| Frisbee + hammocks | `frisbee-hammocks.jpg` |
| Mario Kart tournament | `mario-kart-tournament.jpg` |
| Movie night: cult classics | `movie-night-cult-classics.jpg` |
| Smash Bros casual | `smash-bros-casual.jpg` |
| Board game cafe hangout | `board-game-cafe-hangout.jpg` |
| Silent study + snacks | `silent-study-snacks.jpg` |
| Group pset session: CS 2110 | `group-pset-session-cs-2110.jpg` |
| Finals destress coloring | `finals-destress-coloring.jpg` |
| Late night library coffee run | `late-night-library-coffee-run.jpg` |
| Free headshots pop-up | `free-headshots-pop-up.jpg` |
| Free haircuts (practice cuts) | `free-haircuts-practice-cuts.jpg` |
| Peer tutoring drop-in: Calc 1110 | `peer-tutoring-drop-in-calc-1110.jpg` |
| Resume review walk-ins | `resume-review-walk-ins.jpg` |

If you rename a seeded event, its file name changes too (lowercase, every run of non-letters/digits becomes `-`).
Events posted in the app upload their own photo from the Create form.
