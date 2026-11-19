import { Box3, MOUSE, PerspectiveCamera, TOUCH, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const views = {
  left: { label: 'Слева', direction: new Vector3(1, 0, 0) },
  right: { label: 'Справа', direction: new Vector3(-1, 0, 0) },
  front: { label: 'Спереди', direction: new Vector3(0, 0, 1) },
  back: { label: 'Сзади', direction: new Vector3(0, 0, -1) },
  top: { label: 'Сверху', direction: new Vector3(0, 1, 0.001) },
  bottom: { label: 'Снизу', direction: new Vector3(0, -1, 0.001) },
};
export type View = keyof typeof views;
const defaultDirection = new Vector3(1, 0.20, 0.32).normalize();

export class ModelCamera {
  camera = new PerspectiveCamera(39, 1, 0.02, 100);
  controls: OrbitControls;
  activeBox = new Box3();
  focusBox = new Box3();

  constructor(canvas: HTMLCanvasElement) {
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = false;
    this.controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };
    this.controls.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
    this.camera.position.copy(defaultDirection).multiplyScalar(6);
    this.controls.update();
  }

  setBounds(box: Box3) {
    this.activeBox.copy(box).expandByScalar(0.035);
    box.getCenter(this.controls.cursor);
    this.controls.maxTargetRadius = box.getSize(new Vector3()).length() * 0.6;
  }

  frame(box: Box3, direction = defaultDirection) {
    if (box.isEmpty()) return;
    this.focusBox.copy(box);
    const target = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const forward = direction.clone().normalize();
    const right = new Vector3().crossVectors(new Vector3(0, 1, 0), forward).normalize();
    const up = new Vector3().crossVectors(forward, right);
    const vertical = Math.tan(this.camera.fov * Math.PI / 360);
    const horizontal = vertical * this.camera.aspect;
    let distance = 0;
    for (const x of [-0.5, 0.5]) {
      for (const y of [-0.5, 0.5]) {
        for (const z of [-0.5, 0.5]) {
          const corner = new Vector3(x * size.x, y * size.y, z * size.z);
          const fit = Math.max(Math.abs(corner.dot(right)) / horizontal, Math.abs(corner.dot(up)) / vertical);
          distance = Math.max(distance, fit * 1.24 + corner.dot(forward));
        }
      }
    }
    this.controls.minDistance = Math.max(0.09, size.length() * 0.17);
    this.controls.maxDistance = Math.max(4.5, distance * 1.65);
    this.controls.target.copy(target);
    this.camera.position.copy(target).addScaledVector(forward, Math.max(distance, 0.18));
    this.controls.update();
  }

  limit() {
    if (this.activeBox.isEmpty() || !this.activeBox.containsPoint(this.camera.position)) return;
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    if (!direction.lengthSq()) return;
    const exit = new Vector3(
      direction.x > 0 ? this.activeBox.max.x : this.activeBox.min.x,
      direction.y > 0 ? this.activeBox.max.y : this.activeBox.min.y,
      direction.z > 0 ? this.activeBox.max.z : this.activeBox.min.z,
    ).sub(this.camera.position);
    const travel = Math.min(...(['x', 'y', 'z'] as const)
      .filter((axis) => Math.abs(direction[axis]) > 1e-6)
      .map((axis) => exit[axis] / direction[axis]));
    this.camera.position.addScaledVector(direction, travel + 0.025);
  }

  zoom(factor: number) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = Math.min(this.controls.maxDistance, Math.max(this.controls.minDistance, offset.length() * factor));
    this.camera.position.copy(this.controls.target).add(offset.setLength(distance));
    this.controls.update();
  }

  pan(x: number, y: number) {
    this.camera.updateMatrixWorld();
    const offset = new Vector3(x,y,0).applyQuaternion(this.camera.quaternion)
      .multiplyScalar(this.camera.position.distanceTo(this.controls.target) * 0.05);
    this.controls.target.add(offset);
    this.camera.position.add(offset);
    this.controls.update();
  }

  direction() {
    return this.camera.position.clone().sub(this.controls.target).normalize();
  }
}
