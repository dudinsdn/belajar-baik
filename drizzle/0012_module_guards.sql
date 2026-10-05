-- Published module content is immutable. Revisions use a new material ID.
CREATE TRIGGER material_published_content_guard BEFORE UPDATE OF title,summary,content,order_index,class_subject_id ON materials
WHEN OLD.status='published'
BEGIN SELECT RAISE(ABORT,'published module content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER material_section_insert_guard BEFORE INSERT ON material_sections
WHEN (SELECT status FROM materials WHERE id=NEW.material_id) <> 'draft'
BEGIN SELECT RAISE(ABORT,'module sections require a draft'); END;
--> statement-breakpoint
CREATE TRIGGER material_section_update_guard BEFORE UPDATE ON material_sections
WHEN (SELECT status FROM materials WHERE id=OLD.material_id) <> 'draft' OR (SELECT status FROM materials WHERE id=NEW.material_id) <> 'draft'
BEGIN SELECT RAISE(ABORT,'published module sections are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER material_section_delete_guard BEFORE DELETE ON material_sections
WHEN (SELECT status FROM materials WHERE id=OLD.material_id) <> 'draft'
BEGIN SELECT RAISE(ABORT,'published module sections are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER module_settings_insert_guard BEFORE INSERT ON material_module_settings
WHEN (SELECT status FROM materials WHERE id=NEW.material_id) <> 'draft'
BEGIN SELECT RAISE(ABORT,'module settings require a draft'); END;
--> statement-breakpoint
CREATE TRIGGER module_settings_update_guard BEFORE UPDATE ON material_module_settings
WHEN (SELECT status FROM materials WHERE id=OLD.material_id) <> 'draft'
BEGIN SELECT RAISE(ABORT,'published module settings are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER module_settings_delete_guard BEFORE DELETE ON material_module_settings
WHEN (SELECT status FROM materials WHERE id=OLD.material_id) <> 'draft'
BEGIN SELECT RAISE(ABORT,'published module settings are immutable'); END;
--> statement-breakpoint
CREATE INDEX material_sections_material_order_idx ON material_sections(material_id,order_index);
--> statement-breakpoint
CREATE INDEX material_section_events_section_action_idx ON material_section_events(section_id,action);
