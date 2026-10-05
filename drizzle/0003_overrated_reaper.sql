CREATE TABLE `assignment_basic_competencies` (
	`assignment_id` text NOT NULL,
	`basic_competency_id` text NOT NULL,
	PRIMARY KEY(`assignment_id`, `basic_competency_id`),
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`basic_competency_id`) REFERENCES `basic_competencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `basic_competencies` (
	`id` text PRIMARY KEY NOT NULL,
	`core_competency_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`code` text NOT NULL,
	`description` text NOT NULL,
	`learner_outcome` text NOT NULL,
	`order_index` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`core_competency_id`) REFERENCES `core_competencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `basic_competencies_core_subject_code_uidx` ON `basic_competencies` (`core_competency_id`,`subject_id`,`code`);--> statement-breakpoint
CREATE TABLE `competency_levels` (
	`id` text PRIMARY KEY NOT NULL,
	`curriculum_version_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`order_index` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`curriculum_version_id`) REFERENCES `curriculum_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `competency_levels_version_code_uidx` ON `competency_levels` (`curriculum_version_id`,`code`);--> statement-breakpoint
CREATE TABLE `competency_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`competency_level_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`order_index` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`competency_level_id`) REFERENCES `competency_levels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `competency_packages_level_code_uidx` ON `competency_packages` (`competency_level_id`,`code`);--> statement-breakpoint
CREATE TABLE `core_competencies` (
	`id` text PRIMARY KEY NOT NULL,
	`competency_package_id` text NOT NULL,
	`code` text NOT NULL,
	`description` text NOT NULL,
	`order_index` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`competency_package_id`) REFERENCES `competency_packages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `core_competencies_package_code_uidx` ON `core_competencies` (`competency_package_id`,`code`);--> statement-breakpoint
CREATE TABLE `curriculum_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`curriculum_version_id` text NOT NULL,
	`competency_package_id` text NOT NULL,
	`class_id` text NOT NULL,
	`student_id` text NOT NULL,
	`assigned_at` text NOT NULL,
	`ended_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`curriculum_version_id`) REFERENCES `curriculum_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`competency_package_id`) REFERENCES `competency_packages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `curriculum_assignments_student_status_idx` ON `curriculum_assignments` (`student_id`,`status`);--> statement-breakpoint
CREATE INDEX `curriculum_assignments_class_status_idx` ON `curriculum_assignments` (`class_id`,`status`);--> statement-breakpoint
CREATE TABLE `curriculum_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`framework` text NOT NULL,
	`source_reference` text NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `curriculum_versions_code_uidx` ON `curriculum_versions` (`code`);--> statement-breakpoint
CREATE TABLE `learning_modes` (
	`id` text PRIMARY KEY NOT NULL,
	`curriculum_version_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`minutes_per_skk` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`curriculum_version_id`) REFERENCES `curriculum_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learning_modes_version_code_uidx` ON `learning_modes` (`curriculum_version_id`,`code`);--> statement-breakpoint
CREATE TABLE `material_basic_competencies` (
	`material_id` text NOT NULL,
	`basic_competency_id` text NOT NULL,
	PRIMARY KEY(`material_id`, `basic_competency_id`),
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`basic_competency_id`) REFERENCES `basic_competencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quiz_basic_competencies` (
	`quiz_id` text NOT NULL,
	`basic_competency_id` text NOT NULL,
	PRIMARY KEY(`quiz_id`, `basic_competency_id`),
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`basic_competency_id`) REFERENCES `basic_competencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subject_skk_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`competency_package_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`subject_group` text NOT NULL,
	`planned_skk` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`competency_package_id`) REFERENCES `competency_packages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subject_skk_package_subject_uidx` ON `subject_skk_allocations` (`competency_package_id`,`subject_id`);