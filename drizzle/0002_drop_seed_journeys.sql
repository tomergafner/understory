-- The pre-seeded fastapi/fastapi showcase journey is retired: recent journeys
-- are now exclusively user-created. Purge all previously seeded rows.
DELETE FROM "steps" WHERE "journey_id" = 'seed-fastapi';
DELETE FROM "reviews" WHERE "journey_id" = 'seed-fastapi';
DELETE FROM "journeys" WHERE "id" = 'seed-fastapi';
