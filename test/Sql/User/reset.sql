DELETE FROM "User".users;
ALTER SEQUENCE "User".users_id_seq RESTART;
UPDATE "User".users SET id = DEFAULT;
