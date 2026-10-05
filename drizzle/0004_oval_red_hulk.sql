ALTER TABLE `curriculum_assignments` ADD `assigned_by` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `curriculum_versions` ADD `class_id` text REFERENCES classes(id);--> statement-breakpoint
ALTER TABLE `curriculum_versions` ADD `created_by` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `curriculum_versions` ADD `academic_year` text;--> statement-breakpoint
ALTER TABLE `curriculum_versions` ADD `program` text;--> statement-breakpoint
ALTER TABLE `subject_skk_allocations` ADD `face_to_face_percent` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subject_skk_allocations` ADD `tutorial_percent` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subject_skk_allocations` ADD `independent_percent` integer DEFAULT 100 NOT NULL;