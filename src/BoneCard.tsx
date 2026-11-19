import { Bone as BoneIcon, Crosshair, Layers2, LocateFixed, ScanLine } from 'lucide-react';
import { sections, type Bone } from './data/bones';

export function BoneCard({ bone, isolated, modelAvailable, onIsolate, onFocus }: {
  bone?: Bone;
  isolated: boolean;
  modelAvailable: boolean;
  onIsolate: () => void;
  onFocus: () => void;
}) {
  return (
    <aside className="panel details" aria-labelledby="details-title">
      <div className="panel-title" id="details-title"><Layers2 size={18} /> Карточка кости</div>
      {!bone && <div className="details-empty"><BoneIcon size={28} /><p>{modelAvailable ? 'Выберите кость на модели или в списке.' : 'Выберите кость в списке.'}</p></div>}
      {bone && <>
        <div className="bone-heading">
          <span className="bone-icon"><BoneIcon size={24} /></span>
          <span className="section-label">{sections[bone.section]}</span>
          <h2>{bone.name}</h2>
          <p lang="la" className="latin">{bone.latin}</p>
        </div>
        <dl className="bone-description">
          <div><dt>Расположение</dt><dd>{bone.location}</dd></div>
          <div><dt>Функция</dt><dd>{bone.role}</dd></div>
          {bone.joints && <div><dt>Соединения</dt><dd>{bone.joints}</dd></div>}
          {bone.detail && <div className="species-note"><dt>Особенности вида</dt><dd>{bone.detail}</dd></div>}
        </dl>
        {modelAvailable && <div className="bone-actions">
          <button className="secondary" onClick={onIsolate}>{isolated ? <Layers2 size={17} /> : <ScanLine size={17} />}{isolated ? 'Вернуть в скелет' : 'Показать отдельно'}</button>
          <button className="secondary subtle" onClick={onFocus}><LocateFixed size={17} />Сфокусировать камеру</button>
        </div>}
      </>}
    </aside>
  );
}

export function BoneList({ bones, selected, onSelect, query, setQuery }: {
  bones: Bone[];
  selected: string | null;
  onSelect: (id: string) => void;
  query: string;
  setQuery: (text: string) => void;
}) {
  const normalize = (value: string) => value.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim();
  const matches = bones.filter((bone) => normalize(bone.name + ' ' + bone.latin).includes(normalize(query)));
  return (
    <aside className="panel explorer" aria-labelledby="explorer-title">
      <div className="panel-title" id="explorer-title"><BoneIcon size={19} /> Кости скелета <span className="count">{bones.length}</span></div>
      <div className="search">
        <label htmlFor="search-bones">Поиск на русском и латыни</label>
        <input id="search-bones" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти кость…" />
      </div>
      {matches.length ? <ul className="bone-items">
        {matches.map((bone) => <li key={bone.id}>
          <button aria-pressed={selected === bone.id} onClick={() => onSelect(bone.id)}>
            <span>{bone.name}<em lang="la">{bone.latin}</em></span>{selected === bone.id && <Crosshair size={16} />}
          </button>
        </li>)}
      </ul> : <p className="empty">{query ? 'По этому запросу ничего не найдено.' : 'В этом отделе нет доступных костей.'}</p>}
    </aside>
  );
}
