UPDATE users
SET external_identity_id = 'site:email:nerekab@gmail.com',
    email = 'nerekab@gmail.com',
    display_name = 'Nerekab',
    role = 'teacher',
    status = 'active',
    updated_at = datetime('now')
WHERE id = 'usr_teacher_adi';
--> statement-breakpoint
PRAGMA optimize;
