CREATE TABLE `relic_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`listing` text NOT NULL,
	`buyer` text NOT NULL,
	`status` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`unlockAt` integer,
	FOREIGN KEY (`listing`) REFERENCES `relic_listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `relic_offer_listing` ON `relic_offers` (`listing`,`buyer`,`expiresAt`);