CREATE TABLE `quiz_events` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text,
	`quiz_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quiz_responses` (
	`attempt_id` text NOT NULL,
	`question_id` text NOT NULL,
	`answer_json` text NOT NULL,
	`credit` integer,
	`feedback` text,
	`graded_by` text,
	`graded_at` text,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`attempt_id`, `question_id`),
	FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `quiz_questions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`graded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `quiz_questions` ADD `kind` text DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE `quiz_questions` ADD `competency_id` text REFERENCES basic_competencies(id);--> statement-breakpoint
ALTER TABLE `quiz_questions` ADD `difficulty` text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE `quiz_questions` ADD `accepted_answer` text;--> statement-breakpoint
ALTER TABLE `quiz_questions` ADD `review_section_id` text REFERENCES material_sections(id);--> statement-breakpoint
ALTER TABLE `quizzes` ADD `purpose` text DEFAULT 'formative' NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `max_attempts` integer DEFAULT 3 NOT NULL;