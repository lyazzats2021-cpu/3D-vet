import {
  ACESFilmicToneMapping, AmbientLight, Box3, Color, DirectionalLight, GridHelper, Group,
  Mesh, MeshStandardMaterial, Raycaster, Scene, Vector2, WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import type { Bone, Filter } from '../data/bones';
import { ModelCamera } from './camera';

type Callbacks = {
  hover: (id: string | null, x: number, y: number) => void;
  pick: (id: string) => void;
};

export class SkeletonScene {
  private renderer: WebGLRenderer;
  private composer: EffectComposer;
  private outline: OutlinePass;
  private scene = new Scene();
  private grid = new GridHelper(10, 24, 0x6c597c, 0x51415d);
  private meshMaterial = new MeshStandardMaterial({ color: 0xf3dfbf, roughness: 0.82 });
  private highlight = new MeshStandardMaterial({ color: 0xf4ad45, emissive: 0x7a3705, emissiveIntensity: 0.19, roughness: 0.72 });
  private hovered = new MeshStandardMaterial({ color: 0xf2d5a2, emissive: 0xb88845, emissiveIntensity: 0.18, roughness: 0.82 });
  private model = new Group();
  private groups = new Map<string, { root: Group; box: Box3; meshes: Mesh[]; bone: Bone }>();
  private meshIds = new Map<Mesh, string>();
  private pickable: Mesh[] = [];
  private contextMeshes: Mesh[] = [];
  private contextBox = new Box3();
  private raycaster = new Raycaster();
  private pointers = new Set<number>();
  private press: { x: number; y: number; id: number } | null = null;
  private hoverId: string | null = null;
  private selected: string | null = null;
  private hoverEnabled = true;
  private frameId = 0;
  private observer: ResizeObserver;
  readonly camera: ModelCamera;
  readonly canvas: HTMLCanvasElement;
  visibleBox = new Box3();

  constructor(private host: HTMLDivElement, private callbacks: Callbacks) {
    this.renderer = new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: false });
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('aria-label', 'Интерактивная трёхмерная модель. Стрелки вращают вид, Shift со стрелками перемещает его.');
    this.canvas.setAttribute('role', 'img');
    this.canvas.tabIndex = 0;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.13;
    this.host.append(this.canvas);
    this.camera = new ModelCamera(this.canvas);
    this.scene.add(this.model, this.grid, new AmbientLight(0xf1e5ff, 1.05));
    this.grid.position.y = -0.016;
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.39;
    const key = new DirectionalLight(0xffedd0, 2.2);
    key.position.set(4, 7, 4);
    const fill = new DirectionalLight(0xcac7ff, 1.6);
    fill.position.set(-3, 4, -6);
    const bounce = new DirectionalLight(0xe2c8ff, 0.42);
    bounce.position.set(1, -2, 2);
    this.scene.add(key, fill, bounce);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera.camera));
    this.outline = new OutlinePass(new Vector2(1,1), this.scene, this.camera.camera);
    this.outline.visibleEdgeColor = new Color(0xffedc2);
    this.outline.hiddenEdgeColor = new Color(0x171022);
    this.outline.edgeStrength = 3.7;
    this.outline.edgeThickness = 1.65;
    this.composer.addPass(this.outline);
    this.composer.addPass(new OutputPass());

    this.camera.controls.addEventListener('change', this.changed);
    this.canvas.addEventListener('pointerdown', this.pointerDown);
    this.canvas.addEventListener('pointermove', this.pointerMove);
    this.canvas.addEventListener('pointerup', this.pointerUp);
    this.canvas.addEventListener('pointercancel', this.pointerCancel);
    this.canvas.addEventListener('pointerleave', this.pointerLeave);
    this.canvas.addEventListener('lostpointercapture', this.pointerCancel);
    this.canvas.addEventListener('keydown', this.keyDown);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(this.host);
    this.resize();
  }

  load(gltf: Group, data: Bone[]) {
    const mapped = new Map(data.map((bone) => [bone.id, bone]));
    this.model.add(gltf);
    gltf.updateMatrixWorld(true);
    gltf.traverse((object) => {
      const id = object.userData.boneId;
      const bone = mapped.get(id);
      if (!bone) return;
      if (this.groups.has(id)) throw new Error('Повторяющийся идентификатор ' + id);
      const meshes: Mesh[] = [];
      object.traverse((part) => {
        if (!(part instanceof Mesh)) return;
        for (const material of [part.material].flat()) material.dispose();
        part.material = this.meshMaterial;
        meshes.push(part);
        this.meshIds.set(part, id);
      });
      const box = new Box3().setFromObject(object, true);
      if (meshes.length && !box.isEmpty()) this.groups.set(id, { root: object as Group, box, meshes, bone });
    });
    gltf.traverse((part) => {
      if (!(part instanceof Mesh) || this.meshIds.has(part)) return;
      for (const material of [part.material].flat()) material.dispose();
      part.material = this.meshMaterial;
      this.contextMeshes.push(part);
      this.contextBox.expandByObject(part, true);
    });
    this.update(null, 'all', null, true, true);
    return data.filter((bone) => this.groups.has(bone.id));
  }

  update(selected: string | null, filter: Filter, isolated: string | null, hoverEnabled: boolean, reframe: boolean) {
    this.selected = selected;
    this.hoverEnabled = hoverEnabled;
    this.clearHover();
    this.pickable = [];
    this.visibleBox.makeEmpty();
    for (const [id, group] of this.groups) {
      group.root.visible = isolated ? id === isolated : filter === 'all' || group.bone.section === filter;
      if (group.root.visible) {
        this.visibleBox.union(group.box);
        this.pickable.push(...group.meshes);
      }
    }
    const showContext = !isolated && filter === 'all';
    for (const part of this.contextMeshes) part.visible = showContext;
    if (showContext) {
      this.visibleBox.union(this.contextBox);
      this.pickable.push(...this.contextMeshes);
    }
    this.grid.visible = showContext;
    this.camera.setBounds(this.visibleBox);
    this.color();
    if (reframe) this.camera.frame(this.visibleBox);
    this.schedule();
  }

  focus(id: string) {
    const group = this.groups.get(id);
    if (group?.root.visible) this.camera.frame(group.box, this.camera.direction());
  }

  private color() {
    for (const [id, group] of this.groups) {
      const material = id === this.selected ? this.highlight : id === this.hoverId ? this.hovered : this.meshMaterial;
      for (const mesh of group.meshes) mesh.material = material;
    }
    const selected = this.selected ? this.groups.get(this.selected) : null;
    this.outline.selectedObjects = selected?.root.visible ? [selected.root] : [];
    this.schedule();
  }

  private resize = () => {
    const { clientWidth: w, clientHeight: h } = this.host;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.composer.setSize(w,h);
    const camera = this.camera.camera;
    const oldAspect = camera.aspect;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (Math.abs(oldAspect - camera.aspect) > 0.12) this.camera.frame(this.camera.focusBox, this.camera.direction());
    this.schedule();
  };

  private changed = () => {
    this.camera.limit();
    this.schedule();
  };

  private schedule() {
    if (this.frameId) return;
    this.frameId = requestAnimationFrame(() => {
      this.frameId = 0;
      this.composer.render();
    });
  }

  private hit(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const coordinates = new Vector2(x / rect.width * 2 - 1, 1 - y / rect.height * 2);
    this.camera.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(coordinates, this.camera.camera);
    const hit = this.raycaster.intersectObjects(this.pickable, false)[0];
    return { id: hit ? this.meshIds.get(hit.object as Mesh) ?? null : null, x, y };
  }

  private pointerDown = (event: PointerEvent) => {
    this.pointers.add(event.pointerId);
    this.press = event.button === 0 && this.pointers.size === 1
      ? { x: event.clientX, y: event.clientY, id: event.pointerId } : null;
    this.clearHover();
  };

  private pointerMove = (event: PointerEvent) => {
    if (this.pointers.size) {
      if (this.press && Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y) > 5) this.press = null;
      return;
    }
    if (!this.hoverEnabled || event.pointerType === 'touch') return;
    const { id, x, y } = this.hit(event);
    if (this.hoverId !== id) {
      this.hoverId = id;
      this.color();
    }
    this.canvas.style.cursor = id ? 'pointer' : 'grab';
    this.callbacks.hover(id, x, y);
  };

  private pointerUp = (event: PointerEvent) => {
    if (this.press?.id === event.pointerId && Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y) <= 5) {
      const { id } = this.hit(event);
      if (id) this.callbacks.pick(id);
    }
    this.pointerCancel(event);
  };

  private pointerCancel = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId);
    if (this.press?.id === event.pointerId) this.press = null;
  };

  private pointerLeave = () => this.clearHover();

  private clearHover() {
    if (this.hoverId === null) return;
    this.hoverId = null;
    this.canvas.style.cursor = 'grab';
    this.callbacks.hover(null, 0, 0);
    this.color();
  }

  private keyDown = (event: KeyboardEvent) => {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    if (event.shiftKey) {
      this.camera.pan(...delta);
    } else {
      this.camera.controls.rotateLeft(delta[0] * 0.16);
      this.camera.controls.rotateUp(delta[1] * 0.16);
    }
  };

  dispose() {
    cancelAnimationFrame(this.frameId);
    this.observer.disconnect();
    this.camera.controls.dispose();
    this.model.traverse((object) => { if (object instanceof Mesh) object.geometry.dispose(); });
    this.meshMaterial.dispose();
    this.highlight.dispose();
    this.hovered.dispose();
    this.grid.dispose();
    this.outline.dispose();
    for (const pass of this.composer.passes) if (pass !== this.outline) pass.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
