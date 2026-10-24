ALTER TABLE user_settings ADD COLUMN water_goal_custom boolean NOT NULL DEFAULT false;

CREATE TABLE water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  amount_ml integer NOT NULL CHECK (amount_ml BETWEEN 50 AND 2000)
);
CREATE INDEX water_logs_user_date_idx ON water_logs(user_id, date, logged_at);

CREATE TABLE step_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  steps integer NOT NULL CHECK (steps BETWEEN 0 AND 100000),
  UNIQUE (user_id, date)
);

CREATE TABLE body_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  weight_kg numeric(6, 2) NOT NULL CHECK (weight_kg BETWEEN 20 AND 400),
  waist_cm numeric(6, 2),
  chest_cm numeric(6, 2),
  hips_cm numeric(6, 2),
  biceps_cm numeric(6, 2),
  thigh_cm numeric(6, 2),
  UNIQUE (user_id, date),
  CHECK (waist_cm IS NULL OR waist_cm > 0),
  CHECK (chest_cm IS NULL OR chest_cm > 0),
  CHECK (hips_cm IS NULL OR hips_cm > 0),
  CHECK (biceps_cm IS NULL OR biceps_cm > 0),
  CHECK (thigh_cm IS NULL OR thigh_cm > 0)
);

CREATE TABLE meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES meal_slots(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'on_time', 'late', 'skipped')),
  logged_at timestamptz,
  UNIQUE (user_id, slot_id, date)
);

CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  title text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);
CREATE INDEX workouts_user_date_idx ON workouts(user_id, date DESC);

CREATE TABLE workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id uuid NOT NULL,
  exercise_name text NOT NULL,
  set_no integer NOT NULL CHECK (set_no BETWEEN 1 AND 20),
  reps integer NOT NULL CHECK (reps BETWEEN 1 AND 1000),
  weight_kg numeric(6, 2) CHECK (weight_kg IS NULL OR weight_kg > 0),
  FOREIGN KEY (workout_id, user_id) REFERENCES workouts(id, user_id) ON DELETE CASCADE
);

CREATE TABLE workout_schedule (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  is_workout_day boolean NOT NULL,
  PRIMARY KEY (user_id, weekday)
);
