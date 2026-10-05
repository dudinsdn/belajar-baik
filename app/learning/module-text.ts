type ExportSource = {
  material: Record<string, unknown>;
  settings: Record<string, unknown> | null;
  sections: Record<string, unknown>[];
};
export function moduleText(data: ExportSource) {
  return [
    data.material.title,
    data.material.subject,
    data.material.summary,
    `Estimasi: ${data.settings?.estimated_minutes ?? "Belum diatur"} menit.`,
    `Bobot SKK rencana modul: ${data.settings?.planned_skk ?? "Belum ditetapkan"}. Bukan pengakuan SKK tercapai.`,
    ...data.sections.map(
      (s) =>
        `${s.title}\nKD ${s.competency_code}: ${s.learner_outcome}\n${s.body}${s.media_url ? `\nLampiran ${s.media_type}: ${s.media_url}` : ""}`,
    ),
    data.sections.length
      ? "Progres dan pertanyaan hanya tersimpan ketika terhubung ke server."
      : data.material.content,
  ].join("\n\n");
}
