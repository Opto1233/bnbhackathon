CREATE TABLE `relic_items` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`mintedTo` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `relic_room_items` ON `relic_items` (`room`,`mintedTo`);--> statement-breakpoint
CREATE TABLE `relic_listings` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`item` text NOT NULL,
	`seller` text NOT NULL,
	`price` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`buyer` text,
	`soldAt` integer,
	FOREIGN KEY (`item`) REFERENCES `relic_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_open_relic` ON `relic_listings` (`item`) WHERE status = 'open';--> statement-breakpoint
CREATE INDEX `relic_history` ON `relic_listings` (`item`,`status`);--> statement-breakpoint
CREATE INDEX `relic_buyer` ON `relic_listings` (`room`,`buyer`);--> statement-breakpoint
CREATE INDEX `relic_seller` ON `relic_listings` (`room`,`seller`);--> statement-breakpoint
CREATE TABLE `relic_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`player` text NOT NULL,
	`revision` integer NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `current_expedition` ON `relic_runs` (`room`,`player`);