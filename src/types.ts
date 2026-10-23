export type CategoryId =
  | 'sports'
  | 'arts'
  | 'food'
  | 'outdoors'
  | 'games'
  | 'study'
  | 'services';

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
}

export type ClassYear = 'First-year' | 'Sophomore' | 'Junior' | 'Senior' | 'Transfer';

export interface User {
  netId: string;
  name: string;
  classYear: ClassYear;
  interests: CategoryId[];
  verified: boolean;
}

export type OrganizerType = 'student' | 'club';

export interface EventUpdate {
  id: string;
  type: 'time' | 'location' | 'note';
  message: string;
  createdAt: string;
}

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  category: CategoryId;
  organizerType: OrganizerType;
  organizerName: string;
  organizerNetId: string;
  start: string;
  end: string;
  locationName: string;
  locationNote?: string;
  capacity?: number;
  interestedCount: number;
  accessibility?: string;
  participation?: string;
  updates: EventUpdate[];
  cancelled: boolean;
  createdAt: string;
}

export type ReportReason = 'inappropriate' | 'misleading' | 'unsafe' | 'not_cornell' | 'other';

export interface Report {
  id: string;
  eventId: string;
  reason: ReportReason;
  note?: string;
  createdAt: string;
}
