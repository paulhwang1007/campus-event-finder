-- Demo events, ported from src/data/seedEvents.ts.
-- Times are relative to when this script runs, so re-run it to refresh stale demo data.
-- Seeded events have no organizer_id (their organizers aren't real accounts).

delete from public.events where organizer_id is null;

insert into public.events
  (title, description, category, organizer_type, organizer_name, organizer_net_id,
   start_at, end_at, location_name, location_note, capacity, accessibility, participation)
values
  ('Pickup basketball run', 'Casual full-court run, no tryouts, just show up and hoop. We''ll split teams on the spot.', 'sports', 'student', 'Jordan K.', 'jrk45', now() + interval '-0.5 hours', now() + interval '1.5 hours', 'Helen Newman', null, 12, 'Gym has elevator access', 'Bring sneakers, all skill levels welcome'),
  ('Sunset pickup soccer', 'Low-key soccer on the Arts Quad before it gets dark. Bring a friend or come solo.', 'sports', 'student', 'Diego M.', 'dm289', now() + interval '30 hours', now() + interval '31.5 hours', 'Arts Quad', null, 16, null, 'Cleats optional, we have a few spare balls'),
  ('Disc golf casual round', 'Cornell Frisbee Club''s weekly casual round, non-members totally welcome.', 'sports', 'club', 'Cornell Frisbee Club', 'cfc001', now() + interval '50 hours', now() + interval '52 hours', 'Beebe Lake', 'Meet at the dam trailhead', null, null, 'Bring your own disc or borrow one of ours'),
  ('Climbing wall buddy session', 'Looking for a belay partner at Teagle. Beginners totally welcome, I can show you the ropes.', 'sports', 'student', 'Priya S.', 'ps512', now() + interval '75 hours', now() + interval '76.5 hours', 'Teagle', null, 6, null, 'Belay partner needed, beginners welcome'),
  ('Open mic + sketch night', 'Bring a poem, a song, or just come sketch whoever is performing. No pressure to perform.', 'arts', 'student', 'Maya R.', 'mr883', now() + interval '8 hours', now() + interval '10 hours', 'Willard Straight', null, null, null, null),
  ('Pottery drop-in', 'Cornell Craft Collective is opening the studio for a casual drop-in, no experience needed.', 'arts', 'club', 'Cornell Craft Collective', 'ccc002', now() + interval '32 hours', now() + interval '34 hours', 'Noyes', null, 10, null, 'Clay''s provided, wear clothes you don''t mind getting dirty'),
  ('Watercolor on the Slope', 'Painting the sunset on Libe Slope, bring your own supplies or share mine.', 'arts', 'student', 'Elena V.', 'ev174', now() + interval '100 hours', now() + interval '101.5 hours', 'Libe Slope', null, null, null, null),
  ('Zine-making hangout', 'Cutting, pasting, and photocopying our own little zines. All themes welcome.', 'arts', 'student', 'Theo B.', 'tb620', now() + interval '130 hours', now() + interval '132 hours', 'Duffield Atrium', null, 15, null, null),
  ('Study break pizza', 'Free pizza in Duffield Atrium, come grab a slice and decompress for a bit.', 'food', 'student', 'Sam O.', 'so221', now() + interval '-0.25 hours', now() + interval '1.25 hours', 'Duffield Atrium', null, null, null, 'Free pizza while it lasts'),
  ('Bagel run meetup', 'Walking over to grab bagels and eating them on the Appel Commons patio. Join whenever.', 'food', 'student', 'Nina F.', 'nf340', now() + interval '20 hours', now() + interval '21 hours', 'Appel Commons', null, 8, null, null),
  ('Wing night', 'Group table at Collegetown Bagels'' neighbor wing spot, come for the wings or the company.', 'food', 'student', 'Marcus T.', 'mt775', now() + interval '45 hours', now() + interval '47 hours', 'Collegetown', 'Meet outside CTB', null, null, null),
  ('Boba and board games', 'Bringing boba to the Mann Library lounge for a casual game night. Bring a game if you''ve got one.', 'food', 'club', 'Cornell Board Game Collective', 'cbgc003', now() + interval '95 hours', now() + interval '97.5 hours', 'Mann Library', 'Study lounge, 2nd floor', 10, null, null),
  ('Beebe Lake sunset walk', 'Easy loop around Beebe Lake right as the sun goes down. Dogs and friends welcome.', 'outdoors', 'student', 'Hannah L.', 'hl902', now() + interval '6 hours', now() + interval '7 hours', 'Beebe Lake', null, null, null, null),
  ('Sunrise yoga on the Slope', 'Bring a mat and catch the sunrise with some easy stretching, all levels, very low key.', 'outdoors', 'student', 'Priya S.', 'ps512', now() + interval '15 hours', now() + interval '16 hours', 'Libe Slope', null, 20, null, 'Bring your own mat'),
  ('Gorge trail hike', 'Walking the Fall Creek Gorge trail, moderate pace, stopping for photos along the way.', 'outdoors', 'student', 'Owen P.', 'op440', now() + interval '58 hours', now() + interval '60 hours', 'Fall Creek Gorge Trail', null, 8, 'Uneven terrain, not wheelchair accessible', null),
  ('Frisbee + hammocks', 'Hammocks strung up on the Arts Quad, frisbee on standby if people want to toss.', 'outdoors', 'student', 'Grace H.', 'gh118', now() + interval '118 hours', now() + interval '120 hours', 'Arts Quad', null, null, null, null),
  ('Mario Kart tournament', 'Single-elimination bracket, winner gets bragging rights and a candy prize.', 'games', 'club', 'Cornell Board Game Collective', 'cbgc003', now() + interval '-0.75 hours', now() + interval '1.25 hours', 'Noyes', null, 16, null, null),
  ('Movie night: cult classics', 'Slope Day Film Society''s weekly screening, this week it''s a surprise cult classic pick.', 'games', 'club', 'Slope Day Film Society', 'sdfs004', now() + interval '28 hours', now() + interval '30.5 hours', 'Willard Straight', null, 30, null, null),
  ('Smash Bros casual', 'Setting up the Switch in Noyes, come run it back in Smash. Casual, no ranked salt.', 'games', 'student', 'Leo C.', 'lc667', now() + interval '52 hours', now() + interval '54 hours', 'Noyes', null, 10, null, null),
  ('Board game cafe hangout', 'Bringing a stack of games to the Mann Library lounge, everything from Catan to Codenames.', 'games', 'student', 'Ava K.', 'ak230', now() + interval '140 hours', now() + interval '142.5 hours', 'Mann Library', 'Lounge by the entrance', null, null, null),
  ('Silent study + snacks', 'Quiet co-working session, snacks provided, just BYO laptop and focus.', 'study', 'student', 'Ben R.', 'br305', now() + interval '5 hours', now() + interval '7.5 hours', 'Mann Library', null, null, null, null),
  ('Group pset session: CS 2110', 'Working through the current pset together, bring your own code and questions.', 'study', 'student', 'Will N.', 'wn812', now() + interval '26 hours', now() + interval '28 hours', 'Duffield Atrium', null, 10, null, null),
  ('Finals destress coloring', 'Cornell Craft Collective is bringing coloring books and good music to Noyes.', 'study', 'club', 'Cornell Craft Collective', 'ccc002', now() + interval '90 hours', now() + interval '92 hours', 'Noyes', null, 12, null, null),
  ('Late night library coffee run', 'Walking over for coffee around midnight so the library grind hurts a little less.', 'study', 'student', 'Isabel D.', 'id460', now() + interval '150 hours', now() + interval '151 hours', 'Mann Library', null, null, null, null),
  ('Free headshots pop-up', 'A friend with a nice camera is taking free headshots for LinkedIn, resumes, whatever.', 'services', 'club', 'Cornell Photography Underdogs', 'cpu005', now() + interval '34 hours', now() + interval '37 hours', 'Duffield Atrium', null, null, null, null),
  ('Free haircuts (practice cuts)', 'Cosmetology student practicing cuts, free as long as you''re okay being a little adventurous.', 'services', 'student', 'Jamal W.', 'jw591', now() + interval '62 hours', now() + interval '65 hours', 'Appel Commons', null, 20, null, null),
  ('Peer tutoring drop-in: Calc 1110', 'Free drop-in tutoring, come with questions or just to work through problems together.', 'services', 'student', 'Sofia G.', 'sg734', now() + interval '12 hours', now() + interval '14 hours', 'Mann Library', null, null, null, null),
  ('Resume review walk-ins', 'Quick, casual resume reviews, no appointment needed, just bring a printed or digital copy.', 'services', 'student', 'Caleb J.', 'cj398', now() + interval '145 hours', now() + interval '147 hours', 'Willard Straight', null, 8, null, null);

-- Organizer updates on a few seeded events (PRD: at least 2), so "check what changed" can be tested.
insert into public.event_updates (event_id, type, message, created_at)
select e.id, u.type, u.message, now() - u.ago
from public.events e
join (values
  ('Sunset pickup soccer', 'time', 'Pushed back 30 minutes so more people can make it after class.', interval '3 hours'),
  ('Pottery drop-in', 'note', 'Studio opens 15 minutes early for anyone who wants extra wheel time.', interval '5 hours'),
  ('Pottery drop-in', 'note', 'We have extra aprons now, no need to bring your own.', interval '1 hour'),
  ('Mario Kart tournament', 'note', 'Bracket is filling up. Show up 10 minutes early to get a seed.', interval '20 minutes')
) as u(title, type, message, ago) on u.title = e.title
where e.organizer_id is null;
