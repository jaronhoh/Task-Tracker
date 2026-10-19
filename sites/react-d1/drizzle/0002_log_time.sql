CREATE TABLE `log_time` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text,
	`customer_name` text NOT NULL,
	`task_title` text NOT NULL,
	`task_description` text,
	`note` text,
	`tracker_link` text,
	`activity` text NOT NULL,
	`work_date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	CONSTRAINT "log_title_length" CHECK(length("log_time"."task_title") BETWEEN 1 AND 100),
	CONSTRAINT "log_interval" CHECK(start_time GLOB '[0-2][0-9]:[0-5][0-9]' AND start_time < '24:00' AND end_time GLOB '[0-2][0-9]:[0-5][0-9]' AND end_time < '24:00' AND end_time > start_time),
	CONSTRAINT "log_activity" CHECK(activity IN ('Design','Setup','Development','Testing','Support','Question','Deployment','Traveling','Fine tuning','Meeting','Other'))
);
--> statement-breakpoint
CREATE INDEX `idx_log_time_date` ON `log_time` (`work_date`,`start_time`);--> statement-breakpoint
CREATE INDEX `idx_log_time_task` ON `log_time` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_log_time_customer` ON `log_time` (`customer_name`);
