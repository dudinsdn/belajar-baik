// Read gates also quarantine legacy published records without a curriculum
// mapping. No existing learning history is deleted or rewritten.
export function competencyAccess(
  kind: "material" | "quiz" | "assignment",
  alias: string,
  studentExpression: string,
  managedWork = false,
) {
  const links = {
    material: "material_basic_competencies",
    quiz: "quiz_basic_competencies",
    assignment: "assignment_basic_competencies",
  }[kind];
  const access = `EXISTS(SELECT 1 FROM ${links} link JOIN basic_competencies bc ON bc.id=link.basic_competency_id
    JOIN core_competencies ki ON ki.id=bc.core_competency_id
    JOIN curriculum_assignments ca ON ca.competency_package_id=ki.competency_package_id
    WHERE link.${kind}_id=${alias}.id AND ca.student_id=${studentExpression}
    AND ca.class_id=cs.class_id AND bc.subject_id=cs.subject_id AND ca.status='active')`;
  if (kind !== "assignment" || !managedWork) return access;
  return `${access} AND (NOT EXISTS(SELECT 1 FROM assignment_work aw WHERE aw.assignment_id=${alias}.id) OR NOT EXISTS(SELECT 1 FROM assignment_basic_competencies link JOIN basic_competencies bc ON bc.id=link.basic_competency_id JOIN core_competencies ki ON ki.id=bc.core_competency_id WHERE link.assignment_id=${alias}.id AND (bc.subject_id<>cs.subject_id OR NOT EXISTS(SELECT 1 FROM curriculum_assignments ca WHERE ca.competency_package_id=ki.competency_package_id AND ca.student_id=${studentExpression} AND ca.class_id=cs.class_id AND ca.status='active'))))`;
}
