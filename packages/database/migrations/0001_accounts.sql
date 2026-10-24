CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'UTC',
  latitude double precision,
  longitude double precision,
  location_label text,
  calc_method integer NOT NULL DEFAULT 1,
  asr_school smallint NOT NULL DEFAULT 1 CHECK (asr_school IN (0, 1)),
  fitness_goal text NOT NULL DEFAULT 'maintain' CHECK (fitness_goal IN ('fat_loss', 'bulking', 'maintain')),
  height_cm numeric(5, 2),
  goal_weight_kg numeric(6, 2),
  steps_target integer NOT NULL DEFAULT 10000,
  water_goal_ml integer NOT NULL DEFAULT 2500,
  wake_time time NOT NULL DEFAULT '07:00',
  sleep_time time NOT NULL DEFAULT '23:00',
  water_interval_min integer NOT NULL DEFAULT 120,
  study_daily_target_min integer NOT NULL DEFAULT 180,
  revision_buffer_days integer NOT NULL DEFAULT 0,
  theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens(user_id);

CREATE TABLE dhikr_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_per_day integer NOT NULL CHECK (target_per_day > 0),
  sort_order integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE meal_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  time_local time NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
