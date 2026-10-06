CREATE TABLE `mastery_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`competency_id` text NOT NULL,
	`revision` integer NOT NULL,
	`status` text NOT NULL,
	`evidence_kind` text NOT NULL,
	`evidence_id` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`reason` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `curriculum_assignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`competency_id`) REFERENCES `basic_competencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mastery_revision_unique` ON `mastery_decisions` (`assignment_id`,`competency_id`,`revision`);--> statement-breakpoint
CREATE TABLE `skk_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`allocation_id` text NOT NULL,
	`revision` integer NOT NULL,
	`status` text NOT NULL,
	`credits` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	`reason` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `curriculum_assignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`allocation_id`) REFERENCES `subject_skk_allocations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skk_revision_unique` ON `skk_decisions` (`assignment_id`,`allocation_id`,`revision`);