import type { ExamData, ExamFolder, LegacyQCMData, Question } from "@/types/exam";

function normalizeQuestionOrder(questions: Question[]): Question[] {
  return questions.map((question, index) => ({
    ...question,
    order: question.order ?? index + 1,
  }));
}

function createDefaultFolderFromQuestions(questions: Question[]): ExamFolder {
  return {
    id: "default-questions",
    type: "SQI",
    title: "Questions",
    description: "",
    order: 1,
    questions: normalizeQuestionOrder(questions),
  };
}

export function normalizeExamData(data: ExamData | LegacyQCMData): ExamData {
  const hasFolders =
    "folders" in data && Array.isArray(data.folders) && data.folders.length > 0;

  if (hasFolders) {
    const exam = data as ExamData;

    const folders = exam.folders
      .map((folder, index) => ({
        ...folder,
        id: folder.id || `folder-${index + 1}`,
        order: folder.order ?? index + 1,
        questions: normalizeQuestionOrder(folder.questions || []),
      }))
      .sort((a, b) => a.order - b.order);

    const totalQuestions = folders.reduce(
      (acc, folder) => acc + folder.questions.length,
      0
    );

    return {
      ...exam,
      folders,
      total_questions: totalQuestions,
    };
  }

  const legacy = data as LegacyQCMData;

  const folders = [
    createDefaultFolderFromQuestions(Array.isArray(legacy.questions) ? legacy.questions : []),
  ];

  return {
    matiere: legacy.matiere,
    annee: legacy.annee,
    total_questions: legacy.total_questions || folders[0].questions.length,
    folders,
    questions: legacy.questions || [],
  };
}

export function flattenExamQuestions(exam: ExamData): Question[] {
  return exam.folders.flatMap((folder) => folder.questions);
}