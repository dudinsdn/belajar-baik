export type ProfileData = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  enrollment?: {
    class_name: string;
    program: string;
    grade_level: string;
    academic_year: string;
  } | null;
};

export type LearningPlan = {
  class_subject_id: string;
  student_id: string;
  help_request: string | null;
  id: string;
  title: string;
  mode: string;
  due_at: string;
  instructions: string;
  subject: string;
  learner_outcome: string;
  material_id: string | null;
  percent: number | null;
  last_position: string | null;
  student_name: string;
};
export type PlanningData = {
  plans: LearningPlan[];
  subjects: Array<{ id: string; name: string; class_name: string }>;
  students: Array<{
    id: string;
    display_name: string;
    class_subject_id: string;
    reason: string | null;
    last_activity: string | null;
    inactive: boolean;
    overdue: number;
  }>;
  competencies: Array<{
    id: string;
    learner_outcome: string;
    code: string;
    package_code: string;
    version_code: string;
    class_subject_id: string;
  }>;
  materials: Array<{ id: string; title: string; class_subject_id: string }>;
  assignments: Array<{ id: string; title: string; class_subject_id: string }>;
};
export type DashboardData = {
  interventions: Array<{
    id: string;
    kind: string;
    detail: string;
    due_at: string;
    tutor: string;
    subject: string;
  }>;
  nextPlan: LearningPlan | null;
  plans: LearningPlan[];
  skk: { planned: number };
  feedback: Array<{ id: string; title: string; feedback: string }>;
  assessment: { id: string; title: string } | null;
  continueMaterial?: {
    id: string;
    title: string;
    subject: string;
    percent: number;
    last_position: string | null;
  } | null;
  assignments: Array<{
    id: string;
    title: string;
    due_at: string;
    subject: string;
    submission_status: string;
  }>;
  progress?: { started: number; average_percent: number } | null;
};

export type MaterialData = {
  id: string;
  title: string;
  summary: string;
  order_index: number;
  subject_code: string;
  subject: string;
  percent: number;
  last_position: string | null;
  completed_at: string | null;
};

export type LibraryData = {
  id: string;
  title: string;
  author: string;
  description: string;
  page_count: number;
  subject_code: string | null;
  subject: string | null;
  percent: number;
  bookmarked: number;
  last_position: string | null;
};

export type AssignmentData = {
  managed_work?: number;
  id: string;
  title: string;
  instructions: string;
  due_at: string;
  subject: string;
  answer_text: string | null;
  submission_status: string;
  score: number | null;
  feedback: string | null;
};

export type QuizData = {
  id: string;
  title: string;
  passing_score: number;
  purpose: string;
  max_attempts: number;
  subject: string;
  questions: Array<{
    id: string;
    prompt: string;
    kind: string;
    order_index: number;
    options: Array<{
      id: string;
      question_id: string;
      label: string;
      order_index: number;
    }>;
  }>;
};

export type QuizAttempt = {
  id: string;
  quiz_id: string;
  answers?: Array<{ question_id: string; answer: string | string[] }>;
  status: "active" | "completed";
  score: number | null;
};
export type QuizServerResult = {
  attempt: QuizAttempt;
  passingScore: number;
  passed: boolean | null;
  materialId: string | null;
  answers: Array<{
    question_id: string;
    explanation: string;
    is_correct: number | null;
    prompt: string;
    feedback: string | null;
    review_section_id: string | null;
    correct_option_label: string;
  }>;
};
export type TeacherSubmission = {
  managed_work?: number;
  id: string;
  assignment_id: string;
  assignment_title: string;
  subject: string;
  student_id: string;
  student_name: string;
  answer_text: string;
  status: "submitted" | "graded";
  submitted_at: string;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
};
export type ApiEnvelope<T> =
  { data: T; error?: never } | { data?: never; error: { message: string } };

export type ModuleDetail = {
  settings: {
    estimated_minutes: number;
    planned_skk: number | null;
    prerequisite_id: string | null;
  } | null;
  stats: Array<{
    id: string;
    title: string;
    completed_count: number;
    started_count: number;
    help_count: number;
  }>;
  allocations: Array<{
    package_code: string;
    planned_skk: number;
    face_to_face_percent: number;
    tutorial_percent: number;
    independent_percent: number;
  }>;
  material: {
    id: string;
    title: string;
    summary: string;
    content: string;
    subject: string;
    status: string;
    class_subject_id: string;
    order_index: number;
  };
  sections: Array<{
    id: string;
    title: string;
    body: string;
    kind: string;
    mode: string;
    competency_id: string;
    media_url: string | null;
    media_type: string | null;
    competency_code: string;
    learner_outcome: string;
    completed_at: string | null;
    bookmarked: number;
  }>;
  progress: { percent: number; last_position: string | null } | null;
  events: Array<{
    id: string;
    display_name: string;
    title: string;
    note: string;
    created_at: string;
  }>;
};
export type ModuleCatalog = {
  subjects: Array<{ id: string; name: string; class_name: string }>;
  materials: ModuleDetail["material"][];
  competencies: Array<{
    id: string;
    code: string;
    package_code: string;
    version_code: string;
    learner_outcome: string;
    class_subject_id: string;
  }>;
};
