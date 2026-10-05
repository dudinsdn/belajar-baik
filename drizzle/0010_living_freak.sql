CREATE TABLE `material_module_settings` (
	`material_id` text PRIMARY KEY NOT NULL,
	`prerequisite_id` text,
	`estimated_minutes` integer NOT NULL,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prerequisite_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action
);
