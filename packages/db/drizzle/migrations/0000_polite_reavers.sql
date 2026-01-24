CREATE TABLE `artist_genres` (
	`artist_id` text NOT NULL,
	`genre_id` text NOT NULL,
	`weight` real DEFAULT 1,
	`source` text DEFAULT 'wikidata',
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`genre_id`) REFERENCES `genres`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `artist_relations` (
	`id` text PRIMARY KEY NOT NULL,
	`from_artist_id` text NOT NULL,
	`to_artist_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`strength` real DEFAULT 1,
	`source` text NOT NULL,
	FOREIGN KEY (`from_artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `artists` (
	`id` text PRIMARY KEY NOT NULL,
	`mbid` text,
	`wikidata_id` text,
	`name` text NOT NULL,
	`sort_name` text,
	`country` text,
	`aliases` text DEFAULT '[]',
	`begin_date` text,
	`end_date` text,
	`image_url` text,
	`image_source` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `artists_mbid_unique` ON `artists` (`mbid`);--> statement-breakpoint
CREATE TABLE `genres` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	FOREIGN KEY (`parent_id`) REFERENCES `genres`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `genres_name_unique` ON `genres` (`name`);--> statement-breakpoint
CREATE TABLE `songs` (
	`id` text PRIMARY KEY NOT NULL,
	`mbid` text,
	`title` text NOT NULL,
	`duration` integer,
	`artist_id` text NOT NULL,
	`release_date` text,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `songs_mbid_unique` ON `songs` (`mbid`);