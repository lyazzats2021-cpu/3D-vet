import { ArrowLeft, ArrowRight, Check, ClipboardCheck, RotateCcw, X } from 'lucide-react';
import { correctName, quizTitles, type Answer, type Question } from './quiz';

export function QuizPanel({ questions, answers, index, finished, onAnswer, onNext, onRepeat, onExit }: {
  questions: Question[];
  answers: Answer[];
  index: number;
  finished: boolean;
  onAnswer: (id: string) => void;
  onNext: () => void;
  onRepeat: () => void;
  onExit: () => void;
}) {
  if (finished) {
    const correct = answers.filter((answer) => answer.right).length;
    const errors = answers.flatMap((answer, i) => answer.right ? [] : [{ question: questions[i], answer, i }]);
    return (
      <section className="panel quiz-panel" aria-labelledby="quiz-title">
        <div className="panel-title"><ClipboardCheck size={19} /> Итоги</div>
        <div className="quiz-body">
          <h2 id="quiz-title">Результат</h2>
          <div className="score"><strong>{Math.round(correct / questions.length * 100)}%</strong><span>{correct} из {questions.length} правильных ответов</span></div>
          <h3>{errors.length ? 'Разбор ошибок' : 'Все ответы верны'}</h3>
          {errors.length > 0 && <ol className="mistakes">{errors.map(({ question, answer, i }) => (
            <li key={i}><b>{question.bone.name}</b><span>Ваш ответ: {answer.name}</span><span>Правильно: {correctName(question)}</span></li>
          ))}</ol>}
          <button className="primary wide" onClick={onRepeat}><RotateCcw size={17} />Пройти ещё раз</button>
          <button className="secondary subtle wide" onClick={onExit}><ArrowLeft size={17} />Вернуться к атласу</button>
        </div>
      </section>
    );
  }
  const question = questions[index];
  const answer = answers[index];
  return (
    <section className="panel quiz-panel" aria-labelledby="quiz-title">
      <div className="panel-title"><ClipboardCheck size={19} /> Практика <span className="count">{index + 1} / {questions.length}</span></div>
      <div className="quiz-body">
        <progress value={index + (answer ? 1 : 0)} max={questions.length} aria-label="Выполнено заданий" />
        <h2 id="quiz-title">{quizTitles[question.kind]}</h2>
        {question.kind === 'find' ? <>
          <p>Выберите на 3D-модели указанную структуру.</p><p className="quiz-target">{question.bone.name}</p>
        </> : <p>{question.kind === 'name' ? 'Как называется выделенная структура?' : 'К какому отделу относится выделенная структура?'}</p>}
        {question.choices.length > 0 && (
          <div className="choices">
            {question.choices.map((choice) => <button className="secondary" key={choice.id} disabled={!!answer} onClick={() => onAnswer(choice.id)}>{choice.name}</button>)}
          </div>
        )}
        {question.kind === 'find' && !answer && <button className="secondary subtle wide" onClick={() => onAnswer('')}>Пропустить вопрос</button>}
        {answer && <>
          <div className={'feedback ' + (answer.right ? 'correct' : 'incorrect')} role="status">
            <strong>{answer.right ? <Check size={18} /> : <X size={18} />}{answer.right ? 'Верно' : 'Неверно'}</strong>
            <p>Правильный ответ: <b>{correctName(question)}</b></p>
            <p>{question.bone.location}</p>
            {question.bone.detail && <p>{question.bone.detail}</p>}
          </div>
          <button className="primary wide" onClick={onNext}>{index + 1 === questions.length ? 'Показать результат' : 'Следующее задание'}<ArrowRight size={17} /></button>
        </>}
      </div>
    </section>
  );
}
