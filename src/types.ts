export type CategoryId =
  | 'sports'
  | 'arts'
  | 'food'
  | 'outdoors'
  | 'games'
  | 'study'
  | 'services';

export type IconComponent = (props: { size?: number; className?: string }) => React.JSX.Element;

export interface Category {
  id: CategoryId;
  label: string;
  icon: IconComponent;
  /** CSS gradient used for the card image zone, tinting each category distinctly. */
  gradient: string;
}

export type ClassYear = 'First-year' | 'Sophomore' | 'Junior' | 'Senior' | 'Transfer';

export interface User {
  netId: string;
  name: string;
  classYear?: ClassYear;
  major?: string;
  bio?: string;
  interests: CategoryId[];
  verified: boolean;
  /** False until the user finishes first-time profile setup. */
  onboarded: boolean;
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
  goingCount: number;
  accessibility?: string;
  participation?: string;
  updates: EventUpdate[];
  /** Public URL of the event photo, if it has one. */
  photoUrl?: string;
  /** Where the photo lives in storage; needed to replace or delete it. */
  photoPath?: string;
  cancelled: boolean;
  createdAt: string;
}

export interface NewEventInput {
  title: string;
  description: string;
  category: CategoryId;
  organizerType: OrganizerType;
  organizerName: string;
  start: string;
  end: string;
  locationName: string;
  capacity?: number;
  /** Storage path returned by uploadEventPhoto. */
  photoPath?: string;
}

/** Everything a host can change when editing. Photo changes are passed separately. */
export type EventEditInput = Omit<NewEventInput, 'photoPath'>;

/** What to do with an event's photo when saving an edit. */
export type PhotoChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'replace'; photo: Blob };

/** What a host submits from "Post update". Time and location changes also change the event. */
export type NewUpdateInput =
  | { type: 'time'; message: string; start: string; end: string }
  | { type: 'location'; message: string; locationName: string }
  | { type: 'note'; message: string };

export interface ProfileInput {
  name: string;
  classYear: ClassYear;
  major?: string;
  interests: CategoryId[];
}

export type ReportReason = 'inappropriate' | 'misleading' | 'unsafe' | 'not_cornell' | 'other';

export interface Report {
  id: string;
  eventId: string;
  reason: ReportReason;
  note?: string;
  createdAt: string;
}
