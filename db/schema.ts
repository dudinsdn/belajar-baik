import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    externalIdentityId: text("external_identity_id").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role", { enum: ["student", "teacher", "admin"] }).notNull(),
    status: text("status", { enum: ["active", "inactive"] })
      .notNull()
      .default("active"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_external_identity_uidx").on(t.externalIdentityId),
    uniqueIndex("users_email_uidx").on(t.email),
  ],
);

export const classes = sqliteTable("classes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  program: text("program").notNull(),
  gradeLevel: text("grade_level").notNull(),
  academicYear: text("academic_year").notNull(),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => users.id),
  status: text("status", { enum: ["active", "archived"] })
    .notNull()
    .default("active"),
  ...timestamps,
});

export const classMemberships = sqliteTable(
  "class_memberships",
  {
    classId: text("class_id")
      .notNull()
      .references(() => classes.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    joinedAt: text("joined_at").notNull(),
    status: text("status", { enum: ["active", "inactive"] })
      .notNull()
      .default("active"),
  },
  (t) => [
    primaryKey({ columns: [t.classId, t.studentId] }),
    index("class_memberships_student_idx").on(t.studentId, t.status),
  ],
);

export const subjects = sqliteTable(
  "subjects",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("subjects_code_uidx").on(t.code)],
);

export const classSubjects = sqliteTable(
  "class_subjects",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("class_subjects_class_subject_uidx").on(t.classId, t.subjectId),
  ],
);

export const materials = sqliteTable(
  "materials",
  {
    id: text("id").primaryKey(),
    classSubjectId: text("class_subject_id")
      .notNull()
      .references(() => classSubjects.id),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    content: text("content").notNull(),
    orderIndex: integer("order_index").notNull(),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    publishedAt: text("published_at"),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [
    index("materials_class_status_order_idx").on(
      t.classSubjectId,
      t.status,
      t.orderIndex,
    ),
  ],
);

export const materialProgress = sqliteTable(
  "material_progress",
  {
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    percent: integer("percent").notNull().default(0),
    lastPosition: text("last_position"),
    completedAt: text("completed_at"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.materialId, t.studentId] }),
    index("material_progress_student_idx").on(t.studentId, t.updatedAt),
  ],
);

export const assignments = sqliteTable(
  "assignments",
  {
    id: text("id").primaryKey(),
    classSubjectId: text("class_subject_id")
      .notNull()
      .references(() => classSubjects.id),
    title: text("title").notNull(),
    instructions: text("instructions").notNull(),
    submissionType: text("submission_type").notNull().default("text"),
    dueAt: text("due_at").notNull(),
    allowLate: integer("allow_late", { mode: "boolean" })
      .notNull()
      .default(false),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [
    index("assignments_class_status_due_idx").on(
      t.classSubjectId,
      t.status,
      t.dueAt,
    ),
  ],
);

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    answerText: text("answer_text").notNull().default(""),
    status: text("status", { enum: ["draft", "submitted", "graded"] })
      .notNull()
      .default("draft"),
    submittedAt: text("submitted_at"),
    score: integer("score"),
    feedback: text("feedback"),
    gradedBy: text("graded_by").references(() => users.id),
    gradedAt: text("graded_at"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("submissions_assignment_student_uidx").on(
      t.assignmentId,
      t.studentId,
    ),
    index("submissions_assignment_status_idx").on(t.assignmentId, t.status),
  ],
);

export const quizzes = sqliteTable("quizzes", {
  id: text("id").primaryKey(),
  classSubjectId: text("class_subject_id")
    .notNull()
    .references(() => classSubjects.id),
  materialId: text("material_id").references(() => materials.id),
  title: text("title").notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] })
    .notNull()
    .default("draft"),
  passingScore: integer("passing_score").notNull().default(70),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  ...timestamps,
});

export const quizQuestions = sqliteTable(
  "quiz_questions",
  {
    id: text("id").primaryKey(),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id),
    prompt: text("prompt").notNull(),
    orderIndex: integer("order_index").notNull(),
    explanation: text("explanation").notNull(),
  },
  (t) => [
    uniqueIndex("quiz_questions_quiz_order_uidx").on(t.quizId, t.orderIndex),
  ],
);

export const quizOptions = sqliteTable(
  "quiz_options",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => quizQuestions.id),
    label: text("label").notNull(),
    orderIndex: integer("order_index").notNull(),
    isCorrect: integer("is_correct", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (t) => [
    uniqueIndex("quiz_options_question_order_uidx").on(
      t.questionId,
      t.orderIndex,
    ),
  ],
);

export const quizAttempts = sqliteTable(
  "quiz_attempts",
  {
    id: text("id").primaryKey(),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    status: text("status", { enum: ["active", "completed"] })
      .notNull()
      .default("active"),
    score: integer("score"),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
  },
  (t) => [
    index("quiz_attempts_student_quiz_status_idx").on(
      t.studentId,
      t.quizId,
      t.status,
    ),
  ],
);

export const quizAnswers = sqliteTable(
  "quiz_answers",
  {
    attemptId: text("attempt_id")
      .notNull()
      .references(() => quizAttempts.id),
    questionId: text("question_id")
      .notNull()
      .references(() => quizQuestions.id),
    selectedOptionId: text("selected_option_id")
      .notNull()
      .references(() => quizOptions.id),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.questionId] })],
);

export const libraryItems = sqliteTable(
  "library_items",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id").references(() => subjects.id),
    title: text("title").notNull(),
    author: text("author").notNull(),
    description: text("description").notNull(),
    content: text("content").notNull(),
    pageCount: integer("page_count").notNull(),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    ...timestamps,
  },
  (t) => [index("library_items_subject_status_idx").on(t.subjectId, t.status)],
);

export const libraryProgress = sqliteTable(
  "library_progress",
  {
    libraryItemId: text("library_item_id")
      .notNull()
      .references(() => libraryItems.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    percent: integer("percent").notNull().default(0),
    lastPosition: text("last_position"),
    bookmarked: integer("bookmarked", { mode: "boolean" })
      .notNull()
      .default(false),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.libraryItemId, t.studentId] }),
    index("library_progress_student_idx").on(t.studentId, t.updatedAt),
  ],
);
