import { defineBones, type BoneSpec } from './bones';

const trunkAndLimbs: BoneSpec[] = [
  ['atlas'], ['axis'], ['cervical', 'C1 и C2 представлены в отдельных карточках.', false, { name: 'Шейные позвонки C3–C7', location: 'Между осевым и первым грудным позвонками.' }],
  ['thoracic'], ['lumbar'], ['sacrum'], ['caudal'], ['ribs'], ['sternum'],
  ['scapula'], ['humerus'], ['radius'], ['ulna'], ['carpus'],
  ['metacarpus', 'Сросшиеся III и IV пястные кости несут два опорных пальца.', false, { name: 'Сросшиеся пястные кости III и IV', latin: 'Os metacarpale III et IV' }],
  ['front_phalanges', 'Основные опорные пальцы — III и IV.'],
  ['pelvis'], ['femur'], ['patella'], ['tibia'], ['calcaneus'],
  ['tarsus', 'Пяточная кость вынесена в отдельную карточку.'],
  ['metatarsus', 'Две суставные головки соответствуют пальцам III и IV.', false, { name: 'Сросшиеся плюсневые кости III и IV', latin: 'Ossa metatarsalia III et IV' }],
  ['hind_phalanges', 'Дистальные фаланги образуют костную основу основных копытец.'],
];

export const sheepBones = defineBones([
  ['skull', 'У рогатых овец костная основа рога формируется отростком лобной кости.'],
  ['mandible', 'Нижние резцы смыкаются с верхней зубной подушкой.'],
  ...trunkAndLimbs,
]);

export const goatBones = defineBones([
  ['skull', 'У рогатых коз роговые отростки лобных костей находятся над глазницами.'],
  ['mandible', 'У козы между резцовым рядом и щёчными зубами есть беззубый промежуток.'],
  ...trunkAndLimbs,
]);
