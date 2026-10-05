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
  subject: string;
  questions: Array<{
    id: string;
    prompt: string;
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
  status: "active" | "completed";
  score: number | null;
};
export type QuizServerResult = {
  attempt: QuizAttempt;
  passingScore: number;
  passed: boolean;
  answers: Array<{
    question_id: string;
    explanation: string;
    is_correct: number;
    correct_option_label: string;
  }>;
};
export type TeacherSubmission = {
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
