import modelMapping from '../../sources/model-mapping.json';
import type { Bone } from './bones';
import { catBones } from './cat';
import { cowBones } from './cow';
import { dogBones } from './dog';
import { horseBones } from './horse';

type Credit = {
  title: string;
  author: string;
  source: string;
  sourceLabel: string;
  componentRepository: string;
  changes: string;
};

export type Animal = {
  id: 'dog' | 'cat' | 'cow' | 'horse';
  name: string;
  latin: string;
  limitations: string;
  bones: Bone[];
  model: string;
  credit: Credit;
};

const ariesRepository = 'https://github.com/VT-ARIES/Anatomy';
const ariesRevision = 'a4fdb87bd2e998eea670f873a633883c615758ca';

const ariesCredit = (folder: 'Canine' | 'Bovine' | 'Equine'): Credit => ({
  title: 'Virginia Tech Virtual Animal Project',
  author: 'команда ARIES, Virginia Tech University Libraries',
  source: `${ariesRepository}/tree/${ariesRevision}/models/${folder}`,
  sourceLabel: 'Virginia Tech ARIES',
  componentRepository: ariesRepository,
  changes: 'Собраны учебные группы, нормированы положение и масштаб, упрощены поверхности, удалены текстуры.',
});

export const modelLicense = {
  name: 'CC BY-NC-SA 4.0',
  url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
};
export const nomenclature = 'https://wava-amav.org/wava-documents/';

type ModelComponent = { path: string; commit: string };

export function componentSource(animal: Animal, boneId: string): string {
  const groups: Partial<Record<string, ModelComponent[]>> = modelMapping[animal.id];
  const component = groups[boneId]?.[0];
  if (!component) return animal.credit.source;

  const path = component.path.split('/').map(encodeURIComponent).join('/');
  return `${animal.credit.componentRepository}/blob/${component.commit}/${path}`;
}

export const animals: Animal[] = [
  {
    id: 'dog', name: 'Собака', latin: 'Canis lupus familiaris',
    model: 'dog.glb', credit: ariesCredit('Canine'), bones: dogBones,
    limitations: 'Представлен учебный набор костей. Подъязычный аппарат исключён, зубы не выделены отдельно. Мелкие детали поверхностей упрощены при подготовке модели для браузера.',
  },
  {
    id: 'cat', name: 'Кошка', latin: 'Felis catus',
    model: 'cat.glb', bones: catBones,
    credit: {
      title: 'Cat Skeleton',
      author: 'Tavernier Amaury, разметка участков — sebamestica/Vetworld',
      source: 'https://sketchfab.com/3d-models/cat-skeleton-7106115b299649e992476f2d3b4fc602',
      sourceLabel: 'Cat Skeleton · Sketchfab',
      componentRepository: 'https://github.com/sebamestica/Vetworld',
      changes: 'Участки сгруппированы для выбора, видимые поверхности позвоночника и рёбер размечены дополнительно, ориентация и масштаб нормированы, текстура удалена.',
    },
    limitations: 'Фотограмметрия скелета с десятью выбираемыми участками во всех пяти отделах. Некоторые кости объединены в группы, края участков приблизительны. Неполные поверхности скана сохранены в исходном виде.',
  },
  {
    id: 'cow', name: 'Корова', latin: 'Bos taurus',
    model: 'cow.glb', credit: ariesCredit('Bovine'), bones: cowBones,
    limitations: 'В источнике отсутствуют отдельные модели грудины и крестца. Неидентифицированный фрагмент голени исключён. Мелкие детали поверхностей упрощены.',
  },
  {
    id: 'horse', name: 'Лошадь', latin: 'Equus caballus',
    model: 'horse.glb', credit: ariesCredit('Equine'), bones: horseBones,
    limitations: 'У источника нет отдельной модели локтевой кости и концевой части хвоста. Рёберные хрящи исключены. Мелкие детали поверхностей упрощены.',
  },
];
