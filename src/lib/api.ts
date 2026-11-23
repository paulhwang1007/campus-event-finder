import type { CampusEvent, CategoryId, ClassYear, NewEventInput, OrganizerType, User } from '../types';
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
  location_note: string | null;
  capacity: number | null;
  accessibility: string | null;
  participation: string | null;
  cancelled: boolean;
  created_at: string;
  interested_count?: number;
}

interface ProfileRow {
  id: string;
  net_id: string;
  name: string;
  class_year: ClassYear | null;
  major: string | null;
  bio: string | null;
  interests: CategoryId[];
}

function toEvent(row: EventRow): CampusEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    organizerType: row.organizer_type,
    organizerName: row.organizer_name,
    organizerNetId: row.organizer_net_id,
    start: row.start_at,
    end: row.end_at,
    locationName: row.location_name,
    locationNote: row.location_note ?? undefined,
    capacity: row.capacity ?? undefined,
    interestedCount: row.interested_count ?? 0,
    accessibility: row.accessibility ?? undefined,
    participation: row.participation ?? undefined,
    updates: [],
    cancelled: row.cancelled,
    createdAt: row.created_at,
  };
}

function toUser(row: ProfileRow): User {
  return {
    netId: row.net_id,
    name: row.name,
    classYear: row.class_year ?? undefined,
    major: row.major ?? undefined,
    bio: row.bio ?? undefined,
    interests: row.interests,
    verified: true, // only @cornell.edu accounts can sign up
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
  const { data, error } = await supabase
    .from('events_with_counts')
    .select('*')
    .order('start_at', { ascending: true });
  if (error) throw error;
  return (data as EventRow[]).map(toEvent);
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
      capacity: input.capacity ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toEvent(data as EventRow);
}
