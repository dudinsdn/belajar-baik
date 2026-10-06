CREATE TABLE `attendance_events` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`status` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `learning_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `attendance_plan_time_idx` ON `attendance_events` (`plan_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `mentoring_events` (
	`id` text PRIMARY KEY NOT NULL,
	`class_subject_id` text NOT NULL,
	`student_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`kind` text NOT NULL,
	`detail` text NOT NULL,
	`due_at` text,
	`parent_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`class_subject_id`) REFERENCES `class_subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mentoring_student_subject_idx` ON `mentoring_events` (`student_id`,`class_subject_id`,`created_at`);