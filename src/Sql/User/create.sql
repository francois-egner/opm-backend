INSERT INTO "User".users (email, password_hash, role, forename, surname, display_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;