INSERT INTO "Category".sections (name, entry_id, pos_index) VALUES ($1, $2, $3) RETURNING *;