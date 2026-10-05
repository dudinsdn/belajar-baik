// Read gates also quarantine legacy published records without a curriculum
// mapping. No existing learning history is deleted or rewritten.
export function competencyAccess(
  kind: "material" | "quiz" | "assignment",
  alias: string,
  studentExpression: string,
) {
  const links = {
    material: "material_basic_competencies",
    quiz: "quiz_basic_competencies",
    assignment: "assignment_basic_competencies",
  }[kind];
  return `EXISTS(SELECT 1 FROM ${links} link JOIN basic_competencies bc ON bc.id=link.basic_competency_id
    JOIN core_competencies ki ON ki.id=bc.core_competency_id
    JOIN curriculum_assignments ca ON ca.competency_package_id=ki.competency_package_id
    WHERE link.${kind}_id=${alias}.id AND ca.student_id=${studentExpression}
    AND ca.class_id=cs.class_id AND bc.subject_id=cs.subject_id AND ca.status='active')`;
}
