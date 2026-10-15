CREATE TABLE `customers` (
	`name` text PRIMARY KEY NOT NULL,
	`normalized_name` text NOT NULL,
	`color` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_normalized_name_unique` ON `customers` (`normalized_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_color_unique` ON `customers` (`color`);--> statement-breakpoint
CREATE TABLE `app_revision` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`token` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_sequence` (
	`sequence_name` text PRIMARY KEY NOT NULL,
	`next_value` integer NOT NULL,
	CONSTRAINT "positive_sequence" CHECK("app_sequence"."next_value" >= 1)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`task_id` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`task_title` text NOT NULL,
	`task_description` text,
	`note` text,
	`created` text NOT NULL,
	`end` text,
	`status` text NOT NULL,
	CONSTRAINT "title_length" CHECK(length("tasks"."task_title") BETWEEN 1 AND 100),
	CONSTRAINT "valid_status" CHECK("tasks"."status" IN ('Work in Progress','Pending with Customer','KIV','Closed','Deleted'))
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_customer_id` ON `tasks` (`customer_name`,`task_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_created` ON `tasks` (`created`);