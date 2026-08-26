import { getDb } from "./db";

export type QuestionReportStatus = "nouveau" | "resolu";

export interface QuestionReport {
  id: number;
  matiere: string;
  annee: number;
  questionId: number;
  questionText: string | null;
  message: string;
  userSub: string | null;
  userName: string | null;
  status: QuestionReportStatus;
  createdAt: string;
}

interface QuestionReportRow {
  id: number;
  matiere: string;
  annee: number;
  question_id: number;
  question_text: string | null;
  message: string;
  user_sub: string | null;
  user_name: string | null;
  status: string;
  created_at: string;
}

function rowToReport(row: QuestionReportRow): QuestionReport {
  return {
    id: row.id,
    matiere: row.matiere,
    annee: row.annee,
    questionId: row.question_id,
    questionText: row.question_text,
    message: row.message,
    userSub: row.user_sub,
    userName: row.user_name,
    status: row.status === "resolu" ? "resolu" : "nouveau",
    createdAt: row.created_at,
  };
}

export function createQuestionReport(input: {
  matiere: string;
  annee: number;
  questionId: number;
  questionText?: string;
  message: string;
  userSub?: string;
  userName?: string;
}): void {
  const db = getDb();

  db.prepare(
    `INSERT INTO question_reports
      (matiere, annee, question_id, question_text, message, user_sub, user_name, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'nouveau', ?)`
  ).run(
    input.matiere,
    input.annee,
    input.questionId,
    input.questionText ?? null,
    input.message,
    input.userSub ?? null,
    input.userName ?? null,
    new Date().toISOString()
  );
}

export function listQuestionReports(): QuestionReport[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM question_reports ORDER BY created_at DESC`)
    .all() as unknown as QuestionReportRow[];

  return rows.map(rowToReport);
}

export function setQuestionReportStatus(id: number, status: QuestionReportStatus): void {
  const db = getDb();
  db.prepare(`UPDATE question_reports SET status = ? WHERE id = ?`).run(status, id);
}

export function deleteQuestionReport(id: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM question_reports WHERE id = ?`).run(id);
}
