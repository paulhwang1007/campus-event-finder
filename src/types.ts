export type CategoryId =
  | 'sports'
  | 'arts'
  | 'food'
  | 'outdoors'
  | 'games'
  | 'study'
  | 'services';

/** A map pin. */
export interface LatLng {
  lat: number;
  lng: number;
}

export type IconComponent = (props: { size?: number; className?: string }) => React.JSX.Element;

export interface Category {
  id: CategoryId;
  label: string;
  icon: IconComponent;
  /** CSS gradient used for the card image zone, tinting each category distinctly. */
  gradient: string;
}

export interface User {
  netId: string;
  name: string;
  /** e.g. 2028, shown as "Class of '28". */
  gradYear?: number;
  major?: string;
  bio?: string;
  /** Public URL of the profile photo, if any. */
  avatarUrl?: string;
  /** Where the photo lives in storage; needed to replace or delete it. */
  avatarPath?: string;
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
  /** Exact spot picked on the map, if the host chose one. */
  locationCoords?: LatLng;
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
  locationCoords?: LatLng;
  capacity?: number;
  /** Storage path returned by uploadEventPhoto. */
  photoPath?: string;
}

/** Everything a host can change when editing. Photo changes are passed separately. */
export type EventEditInput = Omit<NewEventInput, 'photoPath'>;

/** What to do with an event's photo when saving an edit. */
export type PhotoChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'replace'; photo: Blob };

/** A host update. The app sends notes from "Message guests"; time and location changes come from Edit. */
export type NewUpdateInput =
  | { type: 'time'; message: string; start: string; end: string }
  | { type: 'location'; message: string; locationName: string; locationCoords?: LatLng }
  | { type: 'note'; message: string };

export interface ProfileInput {
  name: string;
  gradYear: number;
  major?: string;
  bio?: string;
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
