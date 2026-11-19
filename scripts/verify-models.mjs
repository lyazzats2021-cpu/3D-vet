import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  appType: 'custom',
  server: { middlewareMode: true, ws: false },
});
try {
  const { animals } = await server.ssrLoadModule('/src/data/animals.ts');
  const mapping = JSON.parse(await readFile('sources/model-mapping.json', 'utf8'));
  for (const animal of animals) {
    const model = await readFile('public/models/' + animal.model);
    assert.equal(model.toString('ascii', 0, 4), 'glTF', animal.model);
    assert.equal(model.readUInt32LE(4), 2, animal.model);
    assert.equal(model.readUInt32LE(8), model.length, animal.model);
    assert.equal(model.toString('ascii', 16, 20), 'JSON', animal.model);
    const gltf = JSON.parse(model.toString('utf8', 20, 20 + model.readUInt32LE(12)));
    const nodes = gltf.nodes.filter((node) => node.extras?.boneId);
    const allIds = nodes.map((node) => node.extras.boneId);
    const expected = animal.bones.map((bone) => bone.id).sort();
    assert.deepEqual(allIds.sort(), expected, animal.model + ': карточки не совпадают с узлами');
    assert.deepEqual(Object.keys(mapping[animal.id]).sort(), expected, animal.model + ': нет записи о происхождении');
    assert.equal(new Set(expected).size, expected.length, animal.model + ': повторяющийся ID');
    assert.equal(new Set(animal.bones.map((bone) => bone.section)).size, 5, animal.model + ': отсутствует отдел');
    assert.ok(animal.bones.filter((bone) => bone.quiz).length >= 9, animal.model + ': мало вопросов');

    const isMesh = (node) => node.mesh !== undefined && gltf.meshes[node.mesh]?.primitives.some((part) =>
      gltf.accessors[part.attributes.POSITION]?.count > 0);
    const containsMesh = (node) => isMesh(node) || (node.children ?? []).some((i) => containsMesh(gltf.nodes[i]));
    for (const node of nodes) {
      assert.ok(containsMesh(node), animal.model + ': пустая группа ' + node.extras.boneId);
      assert.ok(mapping[animal.id][node.extras.boneId].length > 0, animal.model + ': отсутствует источник');
    }
    assert.ok(!gltf.images?.length && !gltf.buffers.some((buffer) => buffer.uri), animal.model + ': внешние ресурсы');
    console.log(animal.name + ' — ' + expected.length + ' групп с геометрией, карточками и источниками');
  }
} finally {
  await server.close();
}
