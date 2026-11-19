import { Box, Crosshair, Hand, Minus, Plus, RefreshCw, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Mesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Animal } from '../data/animals';
import type { Bone, Filter } from '../data/bones';
import { views, type View } from './camera';
import { SkeletonScene } from './skeleton-scene';

export type CameraAction = { type: 'focus'; id: string } | { type: 'reset' };
type Props = {
  animal: Animal;
  selected: string | null;
  isolated: string | null;
  filter: Filter;
  quiz: boolean;
  action: CameraAction | null;
  onPick: (id: string) => void;
  onLoad: (bones: Bone[]) => void;
};

export function Viewer(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<SkeletonScene | null>(null);
  const callbacks = useRef(props);
  callbacks.current = props;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [attempt, retry] = useState(0);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [angle, setAngle] = useState<View | null>(null);

  useEffect(() => {
    if (!host.current) return;
    let active = true;
    setStatus('loading');
    setHover(null);
    setAngle(null);
    callbacks.current.onLoad([]);
    let scene: SkeletonScene;
    try {
      scene = new SkeletonScene(host.current, {
        pick: (id) => callbacks.current.onPick(id),
        hover: (id, x, y) => setHover(id ? { id, x, y } : null),
      });
    } catch {
      setError('Браузер не смог создать контекст WebGL 2. Проверьте поддержку WebGL и аппаратное ускорение.');
      setStatus('error');
      return;
    }
    runtime.current = scene;
    const loader = new GLTFLoader();
    const embedded = document.getElementById('vet-model-' + props.animal.model)?.textContent;
    const entry = embedded
      ? loader.loadAsync('data:model/gltf-binary;base64,' + embedded)
      : loader.loadAsync(import.meta.env.BASE_URL + 'models/' + props.animal.model);
    entry.then((gltf) => {
      if (!active) {
        gltf.scene.traverse((o) => {
          if (o instanceof Mesh) {
            o.geometry.dispose();
            for (const material of [o.material].flat()) material.dispose();
          }
        });
        return;
      }
      const available = scene.load(gltf.scene, props.animal.bones);
      if (!available.length) throw new Error('No mapped bones');
      callbacks.current.onLoad(available);
      setStatus('ready');
    }).catch(() => {
      if (!active) return;
      setError('Не удалось прочитать файл models/' + props.animal.model + ' или сопоставить его узлы с карточками.');
      setStatus('error');
    });
    return () => {
      active = false;
      runtime.current = null;
      scene.dispose();
    };
  }, [props.animal, attempt]);

  useEffect(() => {
    if (status !== 'ready') return;
    runtime.current?.update(props.selected, props.filter, props.isolated, !props.quiz, true);
    setAngle(null);
  }, [props.filter, props.isolated, props.quiz, status]);

  useEffect(() => {
    if (status === 'ready') runtime.current?.update(props.selected, props.filter, props.isolated, !props.quiz, false);
  }, [props.selected, props.filter, props.isolated, props.quiz, status]);

  useEffect(() => {
    if (status !== 'ready' || !props.action) return;
    const scene = runtime.current;
    if (props.action.type === 'focus') scene?.focus(props.action.id);
    else scene?.camera.frame(scene.visibleBox);
    setAngle(null);
  }, [props.action, status]);

  const direction = (view: View) => {
    const scene = runtime.current;
    if (!scene) return;
    scene.camera.frame(scene.camera.focusBox, views[view].direction);
    setAngle(view);
  };

  const name = props.animal.bones.find((bone) => bone.id === (props.isolated || props.selected))?.name;
  const hoverName = props.animal.bones.find((bone) => bone.id === hover?.id)?.name;

  return (
    <section className="viewer" aria-label="Просмотр скелета">
      <div className="viewer-toolbar">
        <span className="viewer-title"><Box size={18} /> 3D-модель</span>
        <div className="viewer-views" aria-label="Готовые ракурсы">
          {(Object.keys(views) as View[]).map((view) => (
            <button key={view} disabled={status !== 'ready'} aria-pressed={angle === view} onClick={() => direction(view)}>{views[view].label}</button>
          ))}
        </div>
      </div>
      <div className="viewport">
        <div ref={host} className="canvas-host" onPointerDown={() => setAngle(null)} />
        {status === 'ready' && <>
          <div className="viewer-label"><span />{props.isolated && !props.quiz ? 'Отдельный просмотр' : props.animal.name}</div>
          <div className="scene-tools">
            <button type="button" aria-label="Приблизить" title="Приблизить" onClick={() => runtime.current?.camera.zoom(0.8)}><Plus size={19} /></button>
            <button type="button" aria-label="Отдалить" title="Отдалить" onClick={() => runtime.current?.camera.zoom(1.25)}><Minus size={19} /></button>
            <button type="button" aria-label="Сбросить вид" title="Сбросить вид" onClick={() => {
              const scene = runtime.current;
              scene?.camera.frame(scene.visibleBox);
              setAngle(null);
            }}><RefreshCw size={17} /></button>
          </div>
          {name && !props.quiz && !hover && <div className="selection-marker"><Crosshair size={15} />{name}</div>}
          {hover && hoverName && !props.quiz && (
            <div className="bone-tooltip" style={{ left: Math.min(hover.x + 13, Math.max(8, (host.current?.clientWidth ?? 280) - 174)), top: Math.max(8, hover.y - 40) }}>{hoverName}</div>
          )}
        </>}
        {status === 'loading' && <div className="viewer-status" role="status"><span className="spinner" />Загрузка 3D-модели…</div>}
        {status === 'error' && <div className="viewer-status" role="alert"><TriangleAlert size={27} /><strong>Модель недоступна</strong><span>{error}</span><button className="secondary" onClick={() => retry((previous) => previous + 1)}>Повторить загрузку</button></div>}
      </div>
      <div className="viewer-footer"><Hand size={16} /><span>Перетащите, чтобы повернуть <b>·</b> Колесо или щипок для масштаба <b>·</b> Правая кнопка для сдвига</span></div>
    </section>
  );
}
