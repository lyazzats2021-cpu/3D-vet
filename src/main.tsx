import { ArrowLeft, ArrowRight, ArrowUpRight, Box, Cat, ClipboardCheck, Dog, Info, Layers2, PawPrint } from 'lucide-react';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BoneCard, BoneList } from './BoneCard';
import { QuizPanel } from './QuizPanel';
import { animals, modelLicense, type Animal } from './data/animals';
import { sections, type Bone, type Filter, type Section } from './data/bones';
import { makeQuiz, type Answer, type Question } from './quiz';
import { Viewer, type CameraAction } from './viewer/Viewer';
import './styles.css';

function App() {
  const [animal, setAnimal] = useState(animals[0]);
  const [available, setAvailable] = useState<Bone[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>('scapula');
  const [isolated, setIsolated] = useState<string | null>(null);
  const [action, setAction] = useState<CameraAction | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [index, setIndex] = useState(0);
  const finished = questions.length > 0 && index === questions.length;
  const question = questions[index];
  const quiz = questions.length > 0;
  const bone = available.find((item) => item.id === selected);

  function changeAnimal(next: Animal) {
    if (next.id === animal.id) return;
    setAnimal(next);
    setAvailable([]);
    setFilter('all');
    setQuery('');
    setIsolated(null);
    setSelected('scapula');
    setAction(null);
    setQuestions([]);
    setAnswers([]);
    setIndex(0);
  }

  function changeSection(next: Filter) {
    setFilter(next);
    setAction({ type: 'reset' });
    setIsolated(null);
    if (next !== 'all' && bone?.section !== next) setSelected(null);
  }

  function selectFromList(id: string) {
    setSelected(id);
    setIsolated(null);
    setAction({ type: 'focus', id });
  }

  function startQuiz() {
    const next = makeQuiz(available);
    if (next.length < 3) return;
    setQuestions(next);
    setIndex(0);
    setAnswers([]);
    setIsolated(null);
    setAction({ type: 'reset' });
    if (next[0].kind !== 'find') setAction({ type: 'focus', id: next[0].bone.id });
  }

  function exitQuiz() {
    setQuestions([]);
    setAnswers([]);
    setIndex(0);
    setAction({ type: 'reset' });
  }

  function submitAnswer(id: string) {
    if (!question) return;
    const name = question.choices.find((choice) => choice.id === id)?.name ??
      available.find((item) => item.id === id)?.name ?? 'Пропущен';
    setAnswers((current) => current.length === index ? [...current, { id, name, right: id === question.correct }] : current);
  }

  function advance() {
    const next = questions[index + 1];
    setIndex(index + 1);
    setAction(next && next.kind !== 'find' ? { type: 'focus', id: next.bone.id } : { type: 'reset' });
  }

  function pick(id: string) {
    if (quiz) {
      if (question?.kind === 'find') submitAnswer(id);
      return;
    }
    setSelected(id);
  }

  const shownSelection = quiz
    ? question && (question.kind !== 'find' || answers[index]) ? question.bone.id : null
    : bone?.id ?? null;
  const visibleBones = available.filter((item) => filter === 'all' || item.section === filter);
  const quizEnabled = available.filter((item) => item.quiz).length >= 3;

  return (
    <>
      <header className="site-header">
        <div className="shell bar">
          <a className="brand" href={window.location.pathname}><span className="brand-icon"><Box size={22} /></span><span>ВетАнатомия <b>3D</b></span></a>
          <span className="header-topic">Ветеринарная остеология</span>
        </div>
      </header>
      <main className="shell">
        <div className="intro">
          <div>
            <h1>Строение скелета животных</h1>
            <p>Изучайте кости домашних и сельскохозяйственных животных в 3D.</p>
          </div>
          <button className="primary activity-button" disabled={!quiz && !quizEnabled} onClick={quiz ? exitQuiz : startQuiz}>
            {quiz ? <ArrowLeft size={18} /> : <ClipboardCheck size={18} />}{quiz ? 'Вернуться к атласу' : 'Учебные задания'}{!quiz && <ArrowRight size={17} />}
          </button>
        </div>
        <section className="animals" aria-label="Выбор животного">
          {animals.map((item) => (
            <button className="animal" key={item.id} aria-pressed={item.id === animal.id} onClick={() => changeAnimal(item)}>
              <span className="animal-icon">{item.id === 'dog' ? <Dog size={22} /> : item.id === 'cat' ? <Cat size={22} /> : <PawPrint size={21} />}</span>
              <span><b>{item.name}</b><em lang="la">{item.latin}</em></span>
              <span className="radio-mark" />
            </button>
          ))}
        </section>

        {!quiz && <div className="section-bar" aria-label="Отделы скелета">
          <span className="section-bar-label"><Layers2 size={17} />Отделы</span>
          <button aria-pressed={filter === 'all'} onClick={() => changeSection('all')}>Весь скелет</button>
          {(Object.entries(sections) as [Section, string][]).map(([key, title]) => (
            <button key={key} aria-pressed={filter === key} disabled={!available.some((item) => item.section === key)} onClick={() => changeSection(key)}>{title}</button>
          ))}
        </div>}

        <div className={'workspace' + (quiz ? ' quiz-workspace' : '')}>
          {!quiz && <BoneList bones={visibleBones} selected={selected} onSelect={selectFromList} query={query} setQuery={setQuery} />}
          <Viewer key={animal.id} animal={animal} selected={shownSelection}
            isolated={quiz ? null : isolated} filter={quiz ? 'all' : filter}
            quiz={quiz} action={action} onPick={pick} onLoad={setAvailable} />
          {quiz ? <QuizPanel questions={questions} answers={answers} index={index} finished={finished}
            onAnswer={submitAnswer} onNext={advance} onRepeat={startQuiz} onExit={exitQuiz} /> :
            <BoneCard animal={animal} bone={bone} isolated={!!isolated}
              onIsolate={() => {
                if (!bone) return;
                if (isolated) setFilter('all');
                setIsolated(isolated ? null : bone.id);
                setAction({type: 'reset'});
              }}
              onFocus={() => { if (bone) setAction({ type: 'focus', id: bone.id }); }} />}
        </div>

        <footer className="model-note">
          <Info size={18} />
          <div>
            <b>Об учебной модели</b><p>{animal.limitations}</p>
            <div className="source-links model-sources">
              <a href={animal.credit.source} target="_blank" rel="noreferrer">
                {animal.credit.sourceLabel} <ArrowUpRight size={14} aria-hidden="true" />
              </a>
              <a href={modelLicense.url} target="_blank" rel="noreferrer">
                {modelLicense.name} <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
            <details>
              <summary>Авторство и условия использования</summary>
              <p className="credit">{animal.credit.title} — {animal.credit.author}. {animal.credit.changes}</p>
            </details>
          </div>
        </footer>
      </main>
    </>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
