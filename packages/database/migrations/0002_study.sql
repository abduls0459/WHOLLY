CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#82977c' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  exam_date date,
  archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);
CREATE INDEX subjects_user_id_idx ON subjects(user_id);

CREATE TABLE syllabus_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,
  parent_id uuid,
  item_type text NOT NULL CHECK (item_type IN ('unit', 'topic')),
  title text NOT NULL,
  est_minutes integer NOT NULL DEFAULT 120 CHECK (est_minutes >= 0),
  is_done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id, subject_id),
  FOREIGN KEY (subject_id, user_id) REFERENCES subjects(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id, user_id, subject_id) REFERENCES syllabus_items(id, user_id, subject_id) ON DELETE CASCADE,
  CHECK ((item_type = 'unit' AND parent_id IS NULL) OR (item_type = 'topic' AND parent_id IS NOT NULL))
);
CREATE INDEX syllabus_items_subject_idx ON syllabus_items(user_id, subject_id, sort_order);

CREATE TABLE study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,
  date date NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_sec integer NOT NULL CHECK (duration_sec > 0),
  source text NOT NULL CHECK (source IN ('timer', 'manual')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (subject_id, user_id) REFERENCES subjects(id, user_id) ON DELETE CASCADE
);
CREATE INDEX study_sessions_user_date_idx ON study_sessions(user_id, date);

CREATE TABLE running_timers (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,
  started_at timestamptz NOT NULL,
  paused_at timestamptz,
  paused_total_sec integer NOT NULL DEFAULT 0,
  active_since timestamptz,
  active_segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  FOREIGN KEY (subject_id, user_id) REFERENCES subjects(id, user_id) ON DELETE CASCADE
);
