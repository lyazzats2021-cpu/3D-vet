"""Rebuild cat.glb from the licensed Vetworld partition of Tavernier Amaury's scan.

Run with Blender: blender -b --python-exit-code 1 --python scripts/prepare-cat-model.py --
<path to tavernier-partial-surfaces.glb>
"""

import hashlib
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

SOURCE_SHA256 = "06904650fb10da7089a3b123dec2ed4bc5746e5deb40f51613282b2af1514cea"
TRIANGLE_COUNT = 74235
PARTS = {
    "skull": ["proposal-head-skeleton-surface-midline"],
    "scapula": ["proposal-scapula-surface-yneg", "proposal-scapula-surface-ypos"],
    "humerus": ["proposal-humerus-surface-yneg", "proposal-humerus-surface-ypos"],
    "forearm": [
        "proposal-antebrachium-radius-ulna-surface-yneg",
        "proposal-antebrachium-radius-ulna-surface-ypos",
    ],
    "pelvis": ["proposal-os-coxae-surface-yneg", "proposal-os-coxae-surface-ypos"],
    "femur": ["proposal-femur-surface-yneg", "proposal-femur-surface-ypos"],
    "crus": [
        "proposal-crus-tibia-fibula-surface-yneg",
        "proposal-crus-tibia-fibula-surface-ypos",
    ],
    "vertebrae_trunk": ["region-vertebrae-trunk"],
    "ribs": ["region-ribs"],
    "caudal": ["region-caudal"],
}

# These guides mark visibly recognizable surfaces in the source scan's axes.
# They are specific to this file and leave ambiguous joint surfaces unassigned.
SPINE_LOWER = (
    (-4.58, 4.94), (-4.22, 4.91), (-3.58, 4.53), (-3.05, 4.39),
    (-2.55, 4.50), (-2.0, 4.73), (-1.6, 4.87), (-1.1, 4.99),
    (-0.35, 5.13), (0.45, 5.28), (1.5, 5.18), (2.0, 5.0),
    (2.55, 4.82), (3.05, 4.84),
)
TAIL_X = (
    (0.35, 3.58), (0.65, 3.82), (1.08, 4.08), (1.48, 4.32),
    (1.92, 4.55), (2.35, 4.73), (2.70, 4.77), (3.09, 4.77),
    (3.45, 4.80), (3.85, 4.65), (3.98, 4.60),
)
TAIL_Y = (
    (0.35, -0.01), (0.65, 0.07), (1.08, 0.24), (1.48, 0.23),
    (1.92, 0.18), (2.35, 0.08), (2.70, 0.0), (3.09, -0.08),
    (3.45, -0.16), (3.85, -0.17), (3.98, -0.18),
)


def interpolate(value, guide):
    for (start, a), (end, b) in zip(guide, guide[1:]):
        if value <= end:
            return a + (b - a) * max(0, (value - start) / (end - start))
    return guide[-1][1]


def region(center):
    x, y, z = center
    lateral = abs(y - (0.29 - (x + 4.58) * 0.067))
    spine_lower = interpolate(x, SPINE_LOWER)
    if -4.58 <= x <= 3.05 and z > spine_lower and lateral < 0.50:
        return "region-vertebrae-trunk"
    # The anterior ribs cannot be separated reliably from the shoulder in this scan.
    if -1.68 < x < 0.54 and 3.48 < z < spine_lower + 0.10 and lateral > 0.22:
        return "region-ribs"
    if 0.35 < z < 3.98 and abs(x - interpolate(z, TAIL_X)) < 0.20 and abs(y - interpolate(z, TAIL_Y)) < 0.18:
        return "region-caudal"
    return "unidentified-remainder"


def partition_remainder(obj):
    source = obj.data
    world = obj.matrix_world.copy()
    groups = {}
    for face in source.polygons:
        groups.setdefault(region(world @ face.center), []).append(face)
    obj.name += "-source"
    for name, faces in groups.items():
        remap = {}
        vertices = []
        triangles = []
        normals = []
        for face in faces:
            new_face = []
            for loop_index in face.loop_indices:
                source_index = source.loops[loop_index].vertex_index
                if source_index not in remap:
                    remap[source_index] = len(vertices)
                    vertices.append(source.vertices[source_index].co.copy())
                new_face.append(remap[source_index])
                normals.append(source.corner_normals[loop_index].vector.copy())
            triangles.append(new_face)
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(vertices, [], triangles)
        mesh.update()
        for face in mesh.polygons:
            face.use_smooth = True
        mesh.normals_split_custom_set(normals)
        item = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(item)
        item.matrix_world = world
    bpy.data.objects.remove(obj, do_unlink=True)


def main():
    source = Path(sys.argv[sys.argv.index("--") + 1])
    if hashlib.sha256(source.read_bytes()).hexdigest() != SOURCE_SHA256:
        raise ValueError("Use the exact source GLB documented in sources/SOURCES.md.")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source), import_pack_images=False)
    partition_remainder(bpy.data.objects["unidentified-remainder"])
    bpy.context.view_layer.update()
    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if sum(len(obj.data.polygons) for obj in objects) != TRIANGLE_COUNT:
        raise ValueError("The partition must retain every source triangle.")

    # Cranial = -X and dorsal = +Z in this scan. The viewer uses +Z and +Y in glTF.
    rotation = Matrix.Rotation(math.pi / 2, 4, "Z")
    points = [rotation @ obj.matrix_world @ Vector(point) for obj in objects for point in obj.bound_box]
    mins = Vector([min(point[axis] for point in points) for axis in range(3)])
    maxs = Vector([max(point[axis] for point in points) for axis in range(3)])
    offset = Vector(((maxs.x + mins.x) / 2, (maxs.y + mins.y) / 2, mins.z))
    transform = Matrix.Scale(4 / max(maxs - mins), 4) @ Matrix.Translation(-offset) @ rotation
    for obj in objects:
        obj.matrix_world = transform @ obj.matrix_world
        obj.data.materials.clear()
        for uv in list(obj.data.uv_layers):
            obj.data.uv_layers.remove(uv)

    bpy.context.view_layer.update()
    for bone_id, names in PARTS.items():
        group = bpy.data.objects.new("bone__" + bone_id, None)
        group["boneId"] = bone_id
        bpy.context.collection.objects.link(group)
        for name in names:
            obj = bpy.data.objects[name]
            world = obj.matrix_world.copy()
            obj.parent = group
            obj.matrix_world = world

    target = Path(__file__).resolve().parents[1] / "public/models/cat.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(target), export_format="GLB", export_extras=True, export_materials="NONE",
        export_yup=True, export_texcoords=False, export_normals=True,
    )


if __name__ == "__main__":
    main()
