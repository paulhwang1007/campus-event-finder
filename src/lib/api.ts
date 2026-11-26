import type {
  CampusEvent,
  CategoryId,
  EventEditInput,
  EventUpdate,
  NewEventInput,
  NewUpdateInput,
  OrganizerType,
  ProfileInput,
  ReportReason,
  User,
} from '../types';
import { supabase } from './supabase';

export type ResponseStatus = 'interested' | 'passed' | 'going';

interface EventRow {
  id: string;
  title: string;
  description: string;
  category: CategoryId;
  organizer_type: OrganizerType;
  organizer_name: string;
  organizer_net_id: string;
  start_at: string;
  end_at: string;
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
  location_note: string | null;
  capacity: number | null;
  accessibility: string | null;
  participation: string | null;
  cancelled: boolean;
  created_at: string;
  photo_path: string | null;
  organizer_avatar_path?: string | null;
  interested_count?: number;
  going_count?: number;
}

interface ProfileRow {
  id: string;
  net_id: string;
  name: string;
  grad_year: number | null;
  major: string | null;
  bio: string | null;
  avatar_path: string | null;
  interests: CategoryId[];
  onboarded_at: string | null;
}

interface UpdateRow {
  id: string;
  event_id: string;
  type: EventUpdate['type'];
  message: string;
  created_at: string;
}

const PHOTO_BUCKET = 'event-photos';

function photoUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

function toUpdate(row: UpdateRow): EventUpdate {
  return { id: row.id, type: row.type, message: row.message, createdAt: row.created_at };
}

function toEvent(row: EventRow, updates: EventUpdate[] = []): CampusEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    organizerType: row.organizer_type,
    organizerName: row.organizer_name,
    organizerNetId: row.organizer_net_id,
    organizerAvatarUrl: photoUrl(row.organizer_avatar_path ?? null),
    start: row.start_at,
    end: row.end_at,
    locationName: row.location_name,
    locationCoords:
      row.location_lat != null && row.location_lng != null
        ? { lat: row.location_lat, lng: row.location_lng }
        : undefined,
    locationNote: row.location_note ?? undefined,
    capacity: row.capacity ?? undefined,
    interestedCount: row.interested_count ?? 0,
    goingCount: row.going_count ?? 0,
    accessibility: row.accessibility ?? undefined,
    participation: row.participation ?? undefined,
    updates,
    photoUrl: photoUrl(row.photo_path),
    photoPath: row.photo_path ?? undefined,
    cancelled: row.cancelled,
    createdAt: row.created_at,
  };
}

function toUser(row: ProfileRow): User {
  return {
    netId: row.net_id,
    name: row.name,
    gradYear: row.grad_year ?? undefined,
    major: row.major ?? undefined,
    bio: row.bio ?? undefined,
    avatarUrl: photoUrl(row.avatar_path),
    avatarPath: row.avatar_path ?? undefined,
    interests: row.interests,
    verified: true, // only @cornell.edu accounts can sign up
    onboarded: row.onboarded_at != null,
  };
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

export async function fetchProfile(): Promise<User> {
  const userId = await currentUserId();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return toUser(data as ProfileRow);
}

export async function fetchEvents(): Promise<CampusEvent[]> {
  const [events, updates] = await Promise.all([
    supabase.from('events_with_counts').select('*').order('start_at', { ascending: true }),
    supabase.from('event_updates').select('*').order('created_at', { ascending: true }),
  ]);
  if (events.error) throw events.error;
  if (updates.error) throw updates.error;

  // Oldest first, so the last entry is the latest (see markUpdatesSeen / hasUnreadUpdate).
  const byEvent = new Map<string, EventUpdate[]>();
  for (const row of updates.data as UpdateRow[]) {
    const list = byEvent.get(row.event_id) ?? [];
    list.push(toUpdate(row));
    byEvent.set(row.event_id, list);
  }
  return (events.data as EventRow[]).map((row) => toEvent(row, byEvent.get(row.id)));
}

export async function fetchEvent(eventId: string): Promise<CampusEvent> {
  const [event, updates] = await Promise.all([
    supabase.from('events_with_counts').select('*').eq('id', eventId).single(),
    supabase.from('event_updates').select('*').eq('event_id', eventId).order('created_at', { ascending: true }),
  ]);
  if (event.error) throw event.error;
  if (updates.error) throw updates.error;
  return toEvent(event.data as EventRow, (updates.data as UpdateRow[]).map(toUpdate));
}

/** Saves all fields and posts the given automatic updates in one transaction, then returns the fresh event. */
export async function editEvent(
  eventId: string,
  input: EventEditInput,
  photoPath: string | null,
  updates: { type: EventUpdate['type']; message: string }[],
): Promise<CampusEvent> {
  const { error } = await supabase.rpc('edit_event', {
    p_event_id: eventId,
    p_title: input.title,
    p_description: input.description,
    p_category: input.category,
    p_organizer_type: input.organizerType,
    p_organizer_name: input.organizerName,
    p_start_at: input.start,
    p_end_at: input.end,
    p_location_name: input.locationName,
    p_location_lat: input.locationCoords?.lat ?? null,
    p_location_lng: input.locationCoords?.lng ?? null,
    p_capacity: input.capacity ?? null,
    p_photo_path: photoPath,
    p_updates: updates,
  });
  if (error) throw error;
  return fetchEvent(eventId);
}

export async function fetchMyReportedIds(): Promise<string[]> {
  const userId = await currentUserId();
  const { data, error } = await supabase.from('event_reports').select('event_id').eq('reporter_id', userId);
  if (error) throw error;
  return data.map((r) => r.event_id as string);
}

export async function reportEvent(eventId: string, reason: ReportReason, note?: string): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase
    .from('event_reports')
    .upsert(
      { reporter_id: userId, event_id: eventId, reason, note: note?.trim() || null },
      { onConflict: 'reporter_id,event_id' },
    );
  if (error) throw error;
}

export async function postEventUpdate(eventId: string, input: NewUpdateInput): Promise<EventUpdate> {
  const { data, error } = await supabase
    .rpc('post_event_update', {
      p_event_id: eventId,
      p_type: input.type,
      p_message: input.message,
      p_start_at: input.type === 'time' ? input.start : null,
      p_end_at: input.type === 'time' ? input.end : null,
      p_location_name: input.type === 'location' ? input.locationName : null,
      p_location_lat: input.type === 'location' ? (input.locationCoords?.lat ?? null) : null,
      p_location_lng: input.type === 'location' ? (input.locationCoords?.lng ?? null) : null,
    })
    .single();
  if (error) throw error;
  return toUpdate(data as UpdateRow);
}

/** Uploads a (already resized) photo into the user's folder and returns its storage path. */
export async function uploadEventPhoto(photo: Blob, prefix = ''): Promise<string> {
  const userId = await currentUserId();
  const path = `${userId}/${prefix}${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, photo, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw error;
  return path;
}

export async function deleteEventPhoto(path: string): Promise<void> {
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}

/**
 * Demo reset for usability tests: clears this user's swipes, RSVPs and reports, deletes the
 * events they posted (with their photos), and re-anchors the demo events' times to now, so the
 * next participant starts from the seed state.
 */
export async function resetDemo(): Promise<void> {
  const userId = await currentUserId();
  const { data: mine, error: listError } = await supabase
    .from('events')
    .select('photo_path')
    .eq('organizer_id', userId);
  if (listError) throw listError;

  const results = await Promise.all([
    supabase.from('event_responses').delete().eq('user_id', userId),
    supabase.from('event_reports').delete().eq('reporter_id', userId),
    supabase.from('events').delete().eq('organizer_id', userId),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;

  const photos = mine.map((e) => e.photo_path as string | null).filter((p): p is string => !!p);
  if (photos.length > 0) await supabase.storage.from(PHOTO_BUCKET).remove(photos);

  await refreshDemoEvents();
}

/**
 * Moves the seeded demo events to times relative to now, so "happening now" really is.
 * Best effort: if the database function isn't installed yet (migration 005), times just stay put.
 */
export async function refreshDemoEvents(): Promise<void> {
  const { error } = await supabase.rpc('refresh_demo_events');
  if (error) console.warn('Could not refresh demo event times', error);
}

export async function fetchMyResponses(): Promise<{ eventId: string; status: ResponseStatus }[]> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('event_responses')
    .select('event_id, status')
    .eq('user_id', userId);
  if (error) throw error;
  return data.map((r) => ({ eventId: r.event_id as string, status: r.status as ResponseStatus }));
}

export async function setResponse(eventId: string, status: ResponseStatus): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase
    .from('event_responses')
    .upsert({ user_id: userId, event_id: eventId, status }, { onConflict: 'user_id,event_id' });
  if (error) throw error;
}

export async function clearResponse(eventId: string): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase
    .from('event_responses')
    .delete()
    .eq('user_id', userId)
    .eq('event_id', eventId);
  if (error) throw error;
}

export async function clearPassedResponses(): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase
    .from('event_responses')
    .delete()
    .eq('user_id', userId)
    .eq('status', 'passed');
  if (error) throw error;
}

export async function createEvent(input: NewEventInput): Promise<CampusEvent> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: input.title,
      description: input.description,
      category: input.category,
      organizer_type: input.organizerType,
      organizer_name: input.organizerName,
      organizer_id: userId,
      organizer_net_id: '', // filled in by a database trigger from the profile
      start_at: input.start,
      end_at: input.end,
      location_name: input.locationName,
      location_lat: input.locationCoords?.lat ?? null,
      location_lng: input.locationCoords?.lng ?? null,
      capacity: input.capacity ?? null,
      photo_path: input.photoPath ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toEvent(data as EventRow);
}

/** Sets (or clears, with null) the profile photo's storage path. */
export async function setAvatarPath(path: string | null): Promise<User> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_path: path })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return toUser(data as ProfileRow);
}

export async function updateProfile(input: ProfileInput): Promise<User> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('profiles')
    .update({
      name: input.name,
      grad_year: input.gradYear,
      major: input.major ?? null,
      bio: input.bio?.trim() || null,
      interests: input.interests,
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return toUser(data as ProfileRow);
}

export async function cancelEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('events').update({ cancelled: true }).eq('id', eventId);
  if (error) throw error;
}
