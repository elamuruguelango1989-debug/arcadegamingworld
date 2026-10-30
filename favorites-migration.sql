-- Execute once against the SAME D1 database bound as LEADERBOARD_DB.
CREATE TABLE IF NOT EXISTS game_likes (
 game_id TEXT NOT NULL,
 player TEXT NOT NULL,
 created INTEGER NOT NULL,
 PRIMARY KEY(game_id,player)
);
CREATE INDEX IF NOT EXISTS idx_game_likes_game ON game_likes(game_id);
