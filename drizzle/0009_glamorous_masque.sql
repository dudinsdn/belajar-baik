CREATE TABLE `material_section_events` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `material_sections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `material_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`material_id` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`mode` text NOT NULL,
	`competency_id` text NOT NULL,
	`order_index` integer NOT NULL,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`competency_id`) REFERENCES `basic_competencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `material_section_progress` (
	`section_id` text NOT NULL,
	`student_id` text NOT NULL,
	`completed_at` text,
	`bookmarked` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`section_id`, `student_id`),
	FOREIGN KEY (`section_id`) REFERENCES `material_sections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
