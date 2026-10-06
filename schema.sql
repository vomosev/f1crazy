-- F1 Crazy — MySQL schema
-- Usage: mysql -u root -p f1crazy < schema.sql
--
-- Creates the database (if missing), all application tables and the
-- express-mysql-session `sessions` table, then seeds the character and
-- item catalogues used by lib/game/characters.js and lib/game/items.js.

CREATE DATABASE IF NOT EXISTS `f1crazy`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `f1crazy`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- characters
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `characters` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`          VARCHAR(64)  NOT NULL,
  `name`          VARCHAR(96)  NOT NULL,
  `tagline`       VARCHAR(160) NOT NULL DEFAULT '',
  `description`   TEXT         NULL,
  `top_speed`     TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `handling`      TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `luck`          TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `accent_color`  VARCHAR(16)  NOT NULL DEFAULT '#ff2d55',
  `unlock_points` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_starter`    TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_characters_slug` (`slug`),
  KEY `idx_characters_unlock_points` (`unlock_points`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- items (crazy pickups). `svg_key` maps to components/game/ItemIcon.jsx paths.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `items` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`         VARCHAR(64)  NOT NULL,
  `name`         VARCHAR(96)  NOT NULL,
  `svg_key`      VARCHAR(64)  NOT NULL DEFAULT 'mystery-crate',
  `points_value` INT          NOT NULL DEFAULT 0,
  `rarity`       ENUM('common','rare','legendary') NOT NULL DEFAULT 'common',
  `spawn_weight` INT UNSIGNED NOT NULL DEFAULT 10,
  `is_hazard`    TINYINT(1)   NOT NULL DEFAULT 0,
  `description`  TEXT         NULL,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_items_slug` (`slug`),
  KEY `idx_items_rarity` (`rarity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`                 VARCHAR(24)  NOT NULL,
  `email`                    VARCHAR(190) NOT NULL,
  `password_hash`            VARCHAR(255) NOT NULL,
  `selected_character_slug`  VARCHAR(64)  NOT NULL DEFAULT 'banana-baron',
  `total_points`             INT UNSIGNED NOT NULL DEFAULT 0,
  `races_played`             INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_total_points` (`total_points`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- races
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `races` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         INT UNSIGNED NOT NULL,
  `character_slug`  VARCHAR(64)  NOT NULL DEFAULT 'banana-baron',
  `score`           INT UNSIGNED NOT NULL DEFAULT 0,
  `items_collected` INT UNSIGNED NOT NULL DEFAULT 0,
  `best_lap_ms`     INT UNSIGNED NULL,
  `total_time_ms`   INT UNSIGNED NULL,
  `laps`            TINYINT UNSIGNED NOT NULL DEFAULT 3,
  `created_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_races_user_id` (`user_id`),
  KEY `idx_races_score` (`score` DESC),
  KEY `idx_races_created_at` (`created_at`),
  CONSTRAINT `fk_races_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- inventories (per-user crazy item counts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventories` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `item_slug`  VARCHAR(64)  NOT NULL,
  `quantity`   INT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inventories_user_item` (`user_id`, `item_slug`),
  KEY `idx_inventories_item_slug` (`item_slug`),
  CONSTRAINT `fk_inventories_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- sessions (express-mysql-session, createDatabaseTable false)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` VARCHAR(128) NOT NULL,
  `expires`    INT UNSIGNED NOT NULL,
  `data`       MEDIUMTEXT   NULL,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Seed: 6 zany characters
-- ---------------------------------------------------------------------------
INSERT INTO `characters`
  (`slug`, `name`, `tagline`, `description`, `top_speed`, `handling`, `luck`, `accent_color`, `unlock_points`, `is_starter`)
VALUES
  ('banana-baron', 'Banana Baron', 'Slippery when victorious',
   'A monocled aristocrat in a banana-yellow helmet who treats the Grand Hotel Hairpin like his own front drive.',
   7, 6, 8, '#f6c945', 0, 1),
  ('pineapple-pete', 'Pineapple Pete', 'Spiky on the outside, quick on the inside',
   'Pete swapped his surfboard for a street car and still waxes the chassis before every run through the tunnel.',
   6, 8, 6, '#ffb020', 0, 1),
  ('turbo-tortoise', 'Turbo Tortoise', 'Slow start, silly finish',
   'Carries his own crash structure. Builds speed like a freight train and never lifts at Tabac.',
   9, 4, 5, '#3ddc84', 1500, 0),
  ('disco-dolores', 'Disco Dolores', 'Glitterball on four wheels',
   'Races to a permanent 120bpm beat and claims the Nouvelle Chicane is just a dance step.',
   7, 7, 7, '#c86bfa', 3000, 0),
  ('sir-honks-a-lot', 'Sir Honks-a-Lot', 'Horn first, apex later',
   'A rubber duck in racing overalls. What he lacks in grip he makes up for in sheer volume.',
   5, 9, 9, '#4fc3f7', 6000, 0),
  ('neon-nina', 'Neon Nina', 'Lights up the tunnel',
   'Runs an LED bodykit that doubles her visibility and, she insists, her luck with golden pineapples.',
   8, 8, 8, '#ff2d55', 12000, 0)
ON DUPLICATE KEY UPDATE
  `name`          = VALUES(`name`),
  `tagline`       = VALUES(`tagline`),
  `description`   = VALUES(`description`),
  `top_speed`     = VALUES(`top_speed`),
  `handling`      = VALUES(`handling`),
  `luck`          = VALUES(`luck`),
  `accent_color`  = VALUES(`accent_color`),
  `unlock_points` = VALUES(`unlock_points`),
  `is_starter`    = VALUES(`is_starter`);

-- ---------------------------------------------------------------------------
-- Seed: 7 crazy items
-- ---------------------------------------------------------------------------
INSERT INTO `items`
  (`slug`, `name`, `svg_key`, `points_value`, `rarity`, `spawn_weight`, `is_hazard`, `description`)
VALUES
  ('banana', 'Runaway Banana', 'banana', 25, 'common', 40, 0,
   'The paddock classic. Worth a cheeky 25 points and a guaranteed giggle from the grandstand.'),
  ('pineapple', 'Prize Pineapple', 'pineapple', 50, 'common', 25, 0,
   'Tropical, spiky and strangely aerodynamic. Fifty points of pure fruit.'),
  ('rubber-duck', 'Harbour Rubber Duck', 'rubber-duck', 40, 'common', 20, 0,
   'Escaped from a superyacht bathtub and now bobs around the swimming pool section.'),
  ('traffic-cone', 'Rogue Traffic Cone', 'traffic-cone', -15, 'common', 18, 1,
   'A hazard, not a prize. Clip one and the marshals dock you fifteen points.'),
  ('flying-baguette', 'Flying Baguette', 'flying-baguette', 75, 'rare', 10, 0,
   'Launched from a Casino Square balcony. Catch it mid-air for seventy-five points.'),
  ('golden-pineapple', 'Golden Pineapple', 'golden-pineapple', 250, 'legendary', 3, 0,
   'The trophy of the streets. Two hundred and fifty points and instant bragging rights.'),
  ('mystery-crate', 'Mystery Crate', 'mystery-crate', 100, 'rare', 6, 0,
   'Nobody knows what is inside. The scoring computer says roughly a hundred points.')
ON DUPLICATE KEY UPDATE
  `name`         = VALUES(`name`),
  `svg_key`      = VALUES(`svg_key`),
  `points_value` = VALUES(`points_value`),
  `rarity`       = VALUES(`rarity`),
  `spawn_weight` = VALUES(`spawn_weight`),
  `is_hazard`    = VALUES(`is_hazard`),
  `description`  = VALUES(`description`);