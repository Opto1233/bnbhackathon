CREATE TABLE `community_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `community_feed` ON `community_posts` (`channel`,`createdAt`);--> statement-breakpoint
CREATE INDEX `community_author` ON `community_posts` (`author`,`createdAt`);