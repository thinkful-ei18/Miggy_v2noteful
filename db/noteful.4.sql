--`psql -U dev -f ./db/noteful.4.sql -d noteful-app`
-- CREATE TABLE tags (
--   id serial PRIMARY KEY,
--   name text NOT NULL
-- )

-- CREATE TABLE notes_tags (
--   note_id INTEGER NOT NULL REFERENCES notes ON DELETE CASCADE,
--   tag_id INTEGER NOT NULL REFERENCES tags ON DELETE CASCADE
-- );


-- INSERT INTO tags (name) VALUES
-- ('foo'),
-- ('bar'),
-- ('animal'),
-- ('reading');

-- INSERT INTO notes_tags (note_id,tag_id) VALUES
-- (1010,1),
-- (1013,2),
-- (1014,2),
-- (1015,4),
-- (1016,1),
-- (1010,6),
-- (1013,6),
-- (1014,6),
-- (1022,1),
-- (1022,2);

-- SELECT * FROM notes_tags;
SELECT t FROM notes
LEFT JOIN folders ON notes.folder_id = folders.id
LEFT JOIN notes_tags ON notes.id = notes_tags.note_id
LEFT JOIN tags ON notes_tags.tag_id = tags.id
ORDER BY notes.id;
