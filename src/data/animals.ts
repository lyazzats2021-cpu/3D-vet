import type { Bone } from './bones';
import { catBones } from './cat';
import { cowBones } from './cow';
import { dogBones } from './dog';
import { horseBones } from './horse';

type Credit = {
  title: string;
  author: string;
  source: string;
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

const aries: Credit = {
  title: 'Virginia Tech Virtual Animal Project',
  author: 'команда ARIES, Virginia Tech University Libraries',
  source: 'https://github.com/VT-ARIES/Anatomy',
  changes: 'Собраны учебные группы, нормированы положение и масштаб, упрощены поверхности, удалены текстуры.',
};

export const animals: Animal[] = [
  {
    id: 'dog', name: 'Собака', latin: 'Canis lupus familiaris',
    model: 'dog.glb', credit: aries, bones: dogBones,
    limitations: 'Представлен учебный набор костей. Подъязычный аппарат исключён, зубы не выделены отдельно. Мелкие детали поверхностей упрощены при подготовке модели для браузера.',
  },
  {
    id: 'cat', name: 'Кошка', latin: 'Felis catus',
    model: 'cat.glb', bones: catBones,
    credit: {
      title: 'Cat Skeleton',
      author: 'Tavernier Amaury, разметка участков — sebamestica/Vetworld',
      source: 'https://sketchfab.com/3d-models/cat-skeleton-7106115b299649e992476f2d3b4fc602',
      changes: 'Участки сгруппированы для выбора, видимые поверхности позвоночника и рёбер размечены дополнительно, ориентация и масштаб нормированы, текстура удалена.',
    },
    limitations: 'Фотограмметрия скелета с десятью выбираемыми участками во всех пяти отделах. Некоторые кости объединены в группы, края участков приблизительны. Неполные поверхности скана сохранены в исходном виде.',
  },
  {
    id: 'cow', name: 'Корова', latin: 'Bos taurus',
    model: 'cow.glb', credit: aries, bones: cowBones,
    limitations: 'В источнике отсутствуют отдельные модели грудины и крестца. Неидентифицированный фрагмент голени исключён. Мелкие детали поверхностей упрощены.',
  },
  {
    id: 'horse', name: 'Лошадь', latin: 'Equus caballus',
    model: 'horse.glb', credit: aries, bones: horseBones,
    limitations: 'У источника нет отдельной модели локтевой кости и концевой части хвоста. Рёберные хрящи исключены. Мелкие детали поверхностей упрощены.',
  },
];
