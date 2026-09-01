'use strict';

/**
 * Connexion SQLite et schema.
 *
 * Un fichier, aucun service a operer. Le mode WAL laisse les lectures se
 * faire pendant une ecriture : l'ingestion d'un classement ne bloque pas
 * l'affichage d'un profil.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const config = require('./config');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

/**
 * Migrations lineaires. `user_version` porte le numero applique. Une entree
 * deja deployee ne se modifie jamais : pour changer le schema, on en ajoute.
 */
const MIGRATIONS = [
  function initial(d) {
    d.exec(`
      CREATE TABLE user (
        id            TEXT PRIMARY KEY,
        pseudo        TEXT NOT NULL,
        pseudo_norm   TEXT NOT NULL UNIQUE,
        avatar        TEXT NOT NULL DEFAULT '🎮',
        password_hash TEXT,
        discord_id    TEXT UNIQUE,
        discord_name  TEXT,
        role          TEXT NOT NULL DEFAULT 'player',
        created_at    INTEGER NOT NULL,
        last_seen_at  INTEGER NOT NULL
      );

      CREATE TABLE session (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        agent      TEXT
      );
      CREATE INDEX session_user_idx ON session(user_id);
      CREATE INDEX session_exp_idx ON session(expires_at);

      CREATE TABLE game (
        slug            TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        tagline         TEXT NOT NULL DEFAULT '',
        description     TEXT NOT NULL DEFAULT '',
        emoji           TEXT NOT NULL DEFAULT '🎮',
        color           TEXT NOT NULL DEFAULT '#8b5cf6',
        url             TEXT NOT NULL DEFAULT '',
        status          TEXT NOT NULL DEFAULT 'live',
        modes           TEXT NOT NULL DEFAULT '[]',
        ingest_key_hash TEXT,
        sort            INTEGER NOT NULL DEFAULT 0,
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL
      );

      CREATE TABLE match (
        id            TEXT PRIMARY KEY,
        game_slug     TEXT NOT NULL REFERENCES game(slug) ON DELETE CASCADE,
        external_id   TEXT NOT NULL,
        mode          TEXT NOT NULL DEFAULT 'classic',
        challenge_id  TEXT,
        played_at     INTEGER NOT NULL,
        duration_s    INTEGER,
        players_count INTEGER NOT NULL,
        rated         INTEGER NOT NULL DEFAULT 0,
        meta          TEXT,
        received_at   INTEGER NOT NULL
      );
      CREATE INDEX match_game_time_idx ON match(game_slug, played_at);
      CREATE INDEX match_time_idx ON match(played_at);
      CREATE INDEX match_challenge_idx ON match(challenge_id);

      CREATE TABLE match_player (
        match_id      TEXT NOT NULL REFERENCES match(id) ON DELETE CASCADE,
        position      INTEGER NOT NULL,
        user_id       TEXT REFERENCES user(id) ON DELETE SET NULL,
        nickname      TEXT NOT NULL,
        avatar        TEXT NOT NULL DEFAULT '',
        score         REAL NOT NULL DEFAULT 0,
        rank          INTEGER NOT NULL,
        rating_before REAL,
        rating_after  REAL,
        points        INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (match_id, position)
      );
      CREATE INDEX match_player_user_idx ON match_player(user_id, match_id);

      CREATE TABLE rating (
        user_id    TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        game_slug  TEXT NOT NULL REFERENCES game(slug) ON DELETE CASCADE,
        rating     REAL NOT NULL,
        matches    INTEGER NOT NULL DEFAULT 0,
        wins       INTEGER NOT NULL DEFAULT 0,
        podiums    INTEGER NOT NULL DEFAULT 0,
        peak       REAL NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, game_slug)
      );
      CREATE INDEX rating_game_idx ON rating(game_slug, rating);

      CREATE TABLE challenge (
        id          TEXT PRIMARY KEY,
        slug        TEXT NOT NULL UNIQUE,
        game_slug   TEXT REFERENCES game(slug) ON DELETE CASCADE,
        title       TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        emoji       TEXT NOT NULL DEFAULT '🎯',
        kind        TEXT NOT NULL,
        mode        TEXT,
        metric      TEXT NOT NULL,
        seed        TEXT,
        params      TEXT NOT NULL DEFAULT '{}',
        period      TEXT NOT NULL,
        starts_at   INTEGER NOT NULL,
        ends_at     INTEGER NOT NULL,
        closed_at   INTEGER,
        created_by  TEXT,
        created_at  INTEGER NOT NULL
      );
      CREATE INDEX challenge_window_idx ON challenge(starts_at, ends_at);
      CREATE INDEX challenge_game_idx ON challenge(game_slug, ends_at);

      CREATE TABLE badge (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        kind         TEXT NOT NULL,
        label        TEXT NOT NULL,
        emoji        TEXT NOT NULL,
        challenge_id TEXT REFERENCES challenge(id) ON DELETE SET NULL,
        game_slug    TEXT,
        awarded_at   INTEGER NOT NULL
      );
      CREATE INDEX badge_user_idx ON badge(user_id, awarded_at);

      CREATE TABLE ingest_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        game_slug   TEXT,
        external_id TEXT,
        status      TEXT NOT NULL,
        detail      TEXT,
        at          INTEGER NOT NULL
      );
      CREATE INDEX ingest_log_at_idx ON ingest_log(at);
    `);
  },
];

const applied = db.pragma('user_version', { simple: true });
for (let v = applied; v < MIGRATIONS.length; v++) {
  db.transaction(() => {
    MIGRATIONS[v](db);
    db.pragma(`user_version = ${v + 1}`);
  })();
}

module.exports = db;
