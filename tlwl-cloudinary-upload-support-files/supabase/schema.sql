-- TLWL Part 1 platform schema
-- Run this in the Supabase SQL editor before enabling the platform functions.

create extension if not exists pgcrypto;

do $$ begin
  create type tlwl_user_role as enum ('user', 'moderator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type story_category as enum ('education', 'family', 'recovery', 'community', 'new_beginning', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type support_type as enum ('share_story_only', 'financial_support', 'scholarship_support', 'emergency_assistance', 'nominate_someone_else');
exception when duplicate_object then null; end $$;

do $$ begin
  create type story_moderation_status as enum ('draft', 'submitted', 'auto_approved', 'public', 'published', 'accepting_contributions', 'under_review', 'contributions_paused', 'payout_pending_verification', 'payout_verified', 'flagged', 'removed', 'needs_verification', 'verified', 'campaign_ready', 'closed', 'refund_review');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_review_status as enum ('no_reports', 'clear', 'reported', 'under_review', 'paused', 'contributions_paused', 'cleared', 'removed', 'refund_review', 'refunded_if_needed');
exception when duplicate_object then null; end $$;

alter type story_moderation_status add value if not exists 'draft';
alter type story_moderation_status add value if not exists 'public';
alter type story_moderation_status add value if not exists 'accepting_contributions';
alter type story_moderation_status add value if not exists 'under_review';
alter type story_moderation_status add value if not exists 'contributions_paused';
alter type story_moderation_status add value if not exists 'payout_pending_verification';
alter type story_moderation_status add value if not exists 'payout_verified';
alter type story_moderation_status add value if not exists 'refund_review';

alter type report_review_status add value if not exists 'clear';
alter type report_review_status add value if not exists 'contributions_paused';
alter type report_review_status add value if not exists 'refund_review';

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text,
  email text unique,
  role tlwl_user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists story_submissions (
  id uuid primary key default gen_random_uuid(),
  submitter_name text not null,
  submitter_email text not null,
  submitter_phone text,
  title text not null,
  slug text unique,
  category story_category not null default 'other',
  story_body text not null,
  video_url text,
  video_public_id text,
  video_thumbnail_url text,
  supporting_file_url text,
  supporting_file_public_id text,
  support_type support_type not null default 'share_story_only',
  requested_goal numeric(12, 2) not null default 0,
  recipient_name text,
  organizer_name text,
  beneficiary_name text,
  beneficiary_relationship text,
  fund_purpose text,
  fund_use_description text,
  fund_delivery_plan text,
  disclaimer_acknowledged boolean not null default false,
  consent_confirmed boolean not null default false,
  media_consent_confirmed boolean not null default false,
  accuracy_confirmed boolean not null default false,
  moderation_status story_moderation_status not null default 'submitted',
  campaign_status text not null default 'not_requested',
  review_status text not null default 'clear',
  payout_status text not null default 'not_started',
  support_status text not null default 'not_requested',
  risk_level text not null default 'needs_review',
  publication_note text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists support_requests (
  id uuid primary key default gen_random_uuid(),
  story_submission_id uuid references story_submissions(id) on delete cascade,
  request_type support_type not null,
  requested_amount numeric(12, 2) not null default 0,
  organizer_name text,
  beneficiary_name text,
  beneficiary_relationship text,
  fund_purpose text,
  fund_use_description text,
  fund_delivery_plan text,
  recipient_name text,
  nominee_contact text,
  verification_status story_moderation_status not null default 'payout_pending_verification',
  payout_status text not null default 'payout_pending_verification',
  disclaimer_acknowledged boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references story_submissions(id) on delete set null,
  title text not null,
  slug text unique not null,
  category story_category not null default 'other',
  short_description text,
  story_body text not null,
  video_url text,
  video_thumbnail_url text,
  status story_moderation_status not null default 'submitted',
  report_status report_review_status not null default 'no_reports',
  published_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete set null,
  support_request_id uuid references support_requests(id) on delete set null,
  title text not null,
  slug text unique not null,
  organizer_name text,
  beneficiary_name text,
  beneficiary_relationship text,
  fund_purpose text,
  goal_amount numeric(12, 2) not null default 0,
  amount_raised numeric(12, 2) not null default 0,
  supporter_count integer not null default 0,
  fund_use_description text,
  fund_delivery_plan text,
  status story_moderation_status not null default 'submitted',
  campaign_status text not null default 'submitted',
  review_status text not null default 'clear',
  payout_status text not null default 'not_started',
  verification_status story_moderation_status not null default 'payout_pending_verification',
  report_status report_review_status not null default 'no_reports',
  accepting_contributions boolean not null default false,
  contributions_paused boolean not null default false,
  disclaimer_acknowledged boolean not null default false,
  report_count integer not null default 0,
  serious_report_count integer not null default 0,
  payout_verification_due_at timestamptz,
  recipient_verified_at timestamptz,
  payment_setup_verified_at timestamptz,
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists campaign_updates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  title text not null,
  body text not null,
  media_url text,
  status story_moderation_status not null default 'submitted',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contributions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  amount numeric(12, 2) not null default 0,
  tlwl_support_amount numeric(12, 2) not null default 0,
  payment_type text not null default 'campaign_contribution',
  contributor_email text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  reporter_name text not null,
  reporter_email text not null,
  reason text not null,
  details text not null,
  supporting_file_url text,
  severity text not null default 'standard',
  status report_review_status not null default 'reported',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_target_check check (story_id is not null or campaign_id is not null)
);

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  story_submission_id uuid references story_submissions(id) on delete cascade,
  story_id uuid references stories(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  asset_type text not null check (asset_type in ('video', 'photo', 'document', 'screenshot', 'other')),
  provider text not null default 'external_link',
  url text not null,
  public_id text,
  thumbnail_url text,
  resource_type text,
  format text,
  bytes integer,
  duration numeric,
  moderation_status story_moderation_status not null default 'submitted',
  created_at timestamptz not null default now()
);

alter table story_submissions add column if not exists video_public_id text;
alter table story_submissions add column if not exists video_thumbnail_url text;
alter table story_submissions add column if not exists supporting_file_url text;
alter table story_submissions add column if not exists supporting_file_public_id text;
alter table story_submissions add column if not exists organizer_name text;
alter table story_submissions add column if not exists beneficiary_name text;
alter table story_submissions add column if not exists beneficiary_relationship text;
alter table story_submissions add column if not exists fund_purpose text;
alter table story_submissions add column if not exists fund_use_description text;
alter table story_submissions add column if not exists fund_delivery_plan text;
alter table story_submissions add column if not exists disclaimer_acknowledged boolean not null default false;
alter table story_submissions add column if not exists campaign_status text not null default 'not_requested';
alter table story_submissions add column if not exists review_status text not null default 'clear';
alter table story_submissions add column if not exists payout_status text not null default 'not_started';

alter table support_requests add column if not exists organizer_name text;
alter table support_requests add column if not exists beneficiary_name text;
alter table support_requests add column if not exists beneficiary_relationship text;
alter table support_requests add column if not exists fund_purpose text;
alter table support_requests add column if not exists fund_delivery_plan text;
alter table support_requests add column if not exists payout_status text not null default 'payout_pending_verification';
alter table support_requests add column if not exists disclaimer_acknowledged boolean not null default false;

alter table stories add column if not exists short_description text;
alter table stories add column if not exists video_thumbnail_url text;

alter table campaigns add column if not exists organizer_name text;
alter table campaigns add column if not exists beneficiary_name text;
alter table campaigns add column if not exists beneficiary_relationship text;
alter table campaigns add column if not exists fund_purpose text;
alter table campaigns add column if not exists fund_delivery_plan text;
alter table campaigns add column if not exists campaign_status text not null default 'submitted';
alter table campaigns add column if not exists review_status text not null default 'clear';
alter table campaigns add column if not exists payout_status text not null default 'not_started';
alter table campaigns add column if not exists accepting_contributions boolean not null default false;
alter table campaigns add column if not exists disclaimer_acknowledged boolean not null default false;
alter table campaigns add column if not exists report_count integer not null default 0;
alter table campaigns add column if not exists serious_report_count integer not null default 0;
alter table campaigns add column if not exists payout_verification_due_at timestamptz;
alter table campaigns add column if not exists recipient_verified_at timestamptz;
alter table campaigns add column if not exists payment_setup_verified_at timestamptz;

alter table contributions add column if not exists story_id uuid references stories(id) on delete set null;
alter table contributions add column if not exists payment_type text not null default 'campaign_contribution';

alter table reports add column if not exists severity text not null default 'standard';

alter table media_assets add column if not exists thumbnail_url text;
alter table media_assets add column if not exists resource_type text;
alter table media_assets add column if not exists format text;
alter table media_assets add column if not exists bytes integer;
alter table media_assets add column if not exists duration numeric;

create index if not exists stories_status_idx on stories(status);
create index if not exists stories_slug_idx on stories(slug);
create index if not exists campaigns_status_idx on campaigns(status, verification_status);
create index if not exists campaigns_slug_idx on campaigns(slug);
create index if not exists reports_story_idx on reports(story_id);
create index if not exists reports_campaign_idx on reports(campaign_id);
create index if not exists media_assets_submission_idx on media_assets(story_submission_id);
create index if not exists media_assets_story_idx on media_assets(story_id);
create index if not exists media_assets_campaign_idx on media_assets(campaign_id);

alter table profiles enable row level security;
alter table story_submissions enable row level security;
alter table support_requests enable row level security;
alter table stories enable row level security;
alter table campaigns enable row level security;
alter table campaign_updates enable row level security;
alter table contributions enable row level security;
alter table reports enable row level security;
alter table media_assets enable row level security;

drop policy if exists "Public can read published stories" on stories;
create policy "Public can read published stories"
  on stories for select
  using (status in ('public', 'published', 'auto_approved') and report_status not in ('removed'));

drop policy if exists "Public can read published campaigns" on campaigns;
create policy "Public can read published campaigns"
  on campaigns for select
  using (status in ('public', 'accepting_contributions', 'published', 'closed') and report_status not in ('removed'));

drop policy if exists "Public can read published campaign updates" on campaign_updates;
create policy "Public can read published campaign updates"
  on campaign_updates for select
  using (status = 'published');

drop policy if exists "Public can read published media assets" on media_assets;
create policy "Public can read published media assets"
  on media_assets for select
  using (
    exists (
      select 1
      from stories
      where stories.id = media_assets.story_id
        and stories.status in ('public', 'published', 'auto_approved')
        and stories.report_status not in ('removed')
    )
    or exists (
      select 1
      from campaigns
      where campaigns.id = media_assets.campaign_id
        and campaigns.status in ('public', 'accepting_contributions', 'published', 'closed')
        and campaigns.report_status not in ('removed')
    )
  );

-- Keep writes server-side through Netlify Functions using SUPABASE_SERVICE_ROLE_KEY.
-- Add stricter authenticated admin policies when the admin dashboard is built.
