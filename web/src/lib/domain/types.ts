// Core records. The same shapes are mirrored in supabase/migrations.

export type ID = string;
export type ISODate = string;

export type HostStatus = "none" | "pending" | "approved" | "suspended";

export interface NotifyPrefs {
  email: boolean;
  reminders: boolean;
  circleMessages: boolean;
}

export interface User {
  id: ID;
  name: string;
  email: string;
  createdAt: ISODate;
  adultConfirmed: boolean;
  hostStatus: HostStatus;
  isOperator: boolean;
  notify: NotifyPrefs;
  bio?: string;
  deletionRequestedAt?: ISODate;
  /** Sample personas shipped with the demo. Never counted as real activity. */
  isSample?: boolean;
}

export interface Circle {
  id: ID;
  name: string;
  emoji: string;
  createdAt: ISODate;
  createdBy: ID;
  isSample?: boolean;
}

export interface Membership {
  circleId: ID;
  userId: ID;
  role: "host" | "member";
  joinedAt: ISODate;
  leftAt?: ISODate;
}

export type ActionStatus = "draft" | "in_review" | "published" | "cancelled" | "completed";
export type Effort = "easy" | "some" | "stretch";

export interface RoleSlot {
  id: ID;
  name: string;
  emoji: string;
  description: string;
  capacity: number;
}

/** Fields that describe a format and may travel to another group. */
export interface ActionFormat {
  title: string;
  summary: string;
  whatToExpect: string;
  category: string;
  durationMins: number;
  effort: Effort;
  costLabel: string;
  accessibility: string;
  roles: RoleSlot[];
  lessons: string[];
}

export interface Action extends ActionFormat {
  id: ID;
  slug: string;
  circleId?: ID;
  hostId: ID;
  status: ActionStatus;
  startsAt: ISODate;
  /** Public: neighbourhood-level area. */
  areaLabel: string;
  /** Public: name of a public or partner venue. */
  venueName: string;
  /** Private: exact address, only for confirmed participants and hosts. */
  venueAddress: string;
  /** Private: arrival instructions etc. */
  venueNotes: string;
  capacity: number;
  visibility: "public" | "invite";
  /** Host has authorised other groups to adapt this format. */
  allowAdaptation: boolean;
  sourceUrl?: string;
  sourceCredit?: string;
  adaptedFromId?: ID;
  /** Original creator credit, preserved through adaptations. */
  lineageRootId?: ID;
  createdAt: ISODate;
  publishedAt?: ISODate;
  completedAt?: ISODate;
  cancelledAt?: ISODate;
  cancelReason?: string;
  campaignCode: string;
  reviewNote?: string;
  /** Operator flag: the founder prompted this action (pilot measurement). */
  founderPrompted: boolean;
  isSample?: boolean;
}

export type RsvpStatus = "confirmed" | "waitlisted" | "cancelled";
export type Attendance = "unknown" | "self_reported" | "host_confirmed" | "absent";

export interface Rsvp {
  id: ID;
  actionId: ID;
  userId: ID;
  status: RsvpStatus;
  roleSlotId?: ID;
  createdAt: ISODate;
  promotedAt?: ISODate;
  cancelledAt?: ISODate;
  campaignCode?: string;
  channel?: Channel;
  attendance: Attendance;
}

export interface Invitation {
  id: ID;
  actionId: ID;
  token: string;
  createdBy: ID;
  createdAt: ISODate;
  expiresAt: ISODate;
  maxUses: number;
  uses: number;
  revokedAt?: ISODate;
}

export type StoryVisibility = "private" | "awaiting_consent" | "public";

export interface Story {
  id: ID;
  circleId: ID;
  actionId: ID;
  authorId: ID;
  whatHappened: string;
  learned: string;
  next: string;
  visibility: StoryVisibility;
  /** userId -> consent decision; required from every confirmed participant before public. */
  consents: Record<ID, "pending" | "granted" | "declined">;
  createdAt: ISODate;
  publishedAt?: ISODate;
  isSample?: boolean;
}

export interface Feedback {
  id: ID;
  actionId: ID;
  userId: ID;
  worthIt: 1 | 2 | 3 | 4 | 5;
  wouldReturn: boolean;
  feltWelcome: boolean;
  privateNote: string;
  createdAt: ISODate;
}

export interface Appreciation {
  id: ID;
  actionId: ID;
  circleId: ID;
  fromId: ID;
  toId: ID;
  message: string;
  createdAt: ISODate;
}

export interface Message {
  id: ID;
  circleId: ID;
  userId: ID;
  body: string;
  createdAt: ISODate;
}

export type Channel = "x" | "instagram" | "tiktok" | "link" | "unknown";
export type CampaignKind =
  | "visit"
  | "join"
  | "share_opened"
  | "image_downloaded"
  | "caption_copied"
  | "link_copied";

export interface CampaignEvent {
  id: ID;
  actionId: ID;
  code: string;
  channel: Channel;
  kind: CampaignKind;
  userId?: ID;
  createdAt: ISODate;
}

export interface Report {
  id: ID;
  reporterId: ID;
  targetType: "action" | "user" | "message" | "story" | "circle";
  targetId: ID;
  reason: string;
  details: string;
  status: "open" | "resolved" | "dismissed";
  resolution?: string;
  createdAt: ISODate;
  resolvedAt?: ISODate;
}

export interface Appeal {
  id: ID;
  userId: ID;
  subject: string;
  details: string;
  status: "open" | "upheld" | "denied";
  response?: string;
  createdAt: ISODate;
}

export interface Notification {
  id: ID;
  userId: ID;
  text: string;
  href: string;
  createdAt: ISODate;
  readAt?: ISODate;
}

export interface SupportLog {
  id: ID;
  operatorId: ID;
  minutes: number;
  note: string;
  circleId?: ID;
  createdAt: ISODate;
}

export interface Template extends ActionFormat {
  id: ID;
  emoji: string;
  attribution: string;
  createdBy: ID;
  createdAt: ISODate;
}

export interface AuditEvent {
  id: ID;
  actorId: ID | "system";
  action: string;
  targetType: string;
  targetId: ID;
  meta?: Record<string, unknown>;
  at: ISODate;
}

export interface Db {
  version: number;
  users: User[];
  circles: Circle[];
  memberships: Membership[];
  actions: Action[];
  rsvps: Rsvp[];
  invitations: Invitation[];
  stories: Story[];
  feedback: Feedback[];
  appreciations: Appreciation[];
  messages: Message[];
  campaignEvents: CampaignEvent[];
  reports: Report[];
  appeals: Appeal[];
  notifications: Notification[];
  supportLogs: SupportLog[];
  templates: Template[];
  audit: AuditEvent[];
}

export interface Ctx {
  userId: ID | null;
  now: Date;
}
