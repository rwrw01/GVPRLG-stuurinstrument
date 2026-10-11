-- Pre-create the measurement years 2026-2028 so users no longer have to create them by hand.
-- Fixed ids keep this deterministic; ON CONFLICT leaves any year that already exists untouched.
INSERT INTO "metingen" ("id", "jaar", "aangemaakt", "isOefening")
VALUES
  ('meting-2026', 2026, CURRENT_TIMESTAMP, false),
  ('meting-2027', 2027, CURRENT_TIMESTAMP, false),
  ('meting-2028', 2028, CURRENT_TIMESTAMP, false)
ON CONFLICT ("jaar") DO NOTHING;
