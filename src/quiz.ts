import { sections, type Bone, type Section } from './data/bones';

export const quizTitles = {
  find: 'Найди кость',
  name: 'Назови кость',
  section: 'Определи отдел скелета',
};
export type QuizKind = keyof typeof quizTitles;
export type Question = {
  kind: QuizKind;
  bone: Bone;
  choices: { id: string; name: string }[];
  correct: string;
};
export type Answer = { id: string; name: string; right: boolean };

function shuffle<T>(items: readonly T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function makeQuiz(bones: Bone[]): Question[] {
  const selected = shuffle(bones.filter((bone) => bone.quiz)).slice(0, 9);
  const kinds: QuizKind[] = ['find', 'name', 'section'];
  return selected.map((bone, index) => {
    const kind = kinds[index % kinds.length];
    if (kind === 'find') return { kind, bone, choices: [], correct: bone.id };
    if (kind === 'section') {
      const availableSections = [...new Set<Section>(bones.map((item) => item.section))];
      return { kind, bone, choices: shuffle(availableSections).map((id) => ({ id, name: sections[id] })), correct: bone.section };
    }
    const distractors = shuffle(bones.filter((item) => item.id !== bone.id && item.section === bone.section));
    const other = shuffle(bones.filter((item) => item.section !== bone.section));
    const choices = shuffle([bone, ...[...distractors, ...other].slice(0, 3)])
      .map(({ id, name }) => ({ id, name }));
    return { kind, bone, choices, correct: bone.id };
  });
}

export const correctName = (question: Question) =>
  question.kind === 'section' ? sections[question.bone.section] : question.bone.name;
