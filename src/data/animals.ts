import modelMapping from '../../sources/model-mapping.json';
import type { Bone } from './bones';
import { cowBones } from './cow';
import { dogBones } from './dog';
import { horseBones } from './horse';

export type AnimalId = 'dog' | 'cow' | 'horse';
export type Animal = {
  id: AnimalId;
  name: string;
  latin: string;
  source: string;
  model: string;
  limitations: string;
  bones: Bone[];
};

const source = 'https://github.com/VT-ARIES/Anatomy/tree/a4fdb87bd2e998eea670f873a633883c615758ca/models/';
export const nomenclature = 'https://www.wava-amav.org/wava-documents.html';
export const animals: Animal[] = [
  {
    id: 'dog', name: 'Собака', latin: 'Canis lupus familiaris',
    source: source + 'Canine', model: 'dog.glb', bones: dogBones,
    limitations: 'Представлен учебный набор костей. Подъязычный аппарат исключён, зубы не выделены отдельно. Мелкие детали поверхностей упрощены при подготовке модели для браузера.',
  },
  {
    id: 'cow', name: 'Корова', latin: 'Bos taurus',
    source: source + 'Bovine', model: 'cow.glb', bones: cowBones,
    limitations: 'В источнике отсутствуют отдельные модели грудины и крестца. Неидентифицированный фрагмент голени исключён. Мелкие детали поверхностей упрощены.',
  },
  {
    id: 'horse', name: 'Лошадь', latin: 'Equus caballus',
    source: source + 'Equine', model: 'horse.glb', bones: horseBones,
    limitations: 'У источника нет отдельной модели локтевой кости и концевой части хвоста. Рёберные хрящи исключены. Мелкие детали поверхностей упрощены.',
  },
];

export function componentSource(animal: Animal, id: string) {
  const paths = modelMapping[animal.id] as Record<string, { path: string; commit: string }[]>;
  const item = paths[id]?.[0];
  if (!item) return animal.source;
  const path = item.path.split('/').map(encodeURIComponent).join('/');
  return 'https://github.com/VT-ARIES/Anatomy/blob/' + item.commit + '/' + path;
}
