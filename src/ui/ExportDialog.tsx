import { useEffect, useMemo, useState } from 'react';
import type { Employee, Plan } from '../domain/types';
import { sceneDataUrl } from '../export/png';
import { buildExportScenes, type ExportScene } from '../export/scene';

interface Props {
  plan: Plan;
  employees: Employee[];
  onClose(): void;
  onExport(scenes: ExportScene[]): Promise<void>;
}

export function ExportDialog({ plan, employees, onClose, onExport }: Props) {
  const [start, setStart] = useState(plan.rangeStart);
  const [end, setEnd] = useState(plan.rangeEnd);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scenes = useMemo(() => {
    if (!start || !end || start > end) return [];
    return buildExportScenes(plan, employees, { start, end });
  }, [plan, employees, start, end]);

  useEffect(() => {
    let alive = true;
    if (!scenes[0]) { setPreview(''); return; }
    void sceneDataUrl(scenes[0]).then(url => { if (alive) setPreview(url); }).catch(reason => { if (alive) setError((reason as Error).message); });
    return () => { alive = false; };
  }, [scenes]);

  async function save() {
    if (!scenes.length) { setError('Проверьте диапазон дат'); return; }
    setBusy(true); setError('');
    try { await onExport(scenes); onClose(); }
    catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="modal-scrim" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="modal export-modal">
    <div className="drawer-heading"><div><span className="eyebrow">ПРЕЗЕНТАЦИЯ И ИЗОБРАЖЕНИЕ</span><h2>Экспорт Ганта</h2></div><button className="icon-button" onClick={onClose}>×</button></div>
    <div className="export-controls"><div className="field-pair"><label className="field">Показать с<input type="date" value={start} onChange={event => setStart(event.target.value)} /></label><label className="field">По<input type="date" value={end} onChange={event => setEnd(event.target.value)} /></label></div><span>{scenes.length} {scenes.length === 1 ? 'слайд' : 'слайда'}</span></div>
    <div className="export-preview">{preview && <img src={preview} alt="Предпросмотр слайда Ганта" />}</div>
    <p className="panel-intro">PPTX состоит из редактируемых элементов PowerPoint. PNG сохраняется рядом с ним.</p>
    {error && <p className="form-error">{error}</p>}
    <div className="drawer-actions"><button className="primary-button" disabled={busy} onClick={() => void save()}>{busy ? 'Подготовка…' : 'Сохранить PPTX и PNG'}</button><button className="ghost-button" onClick={onClose}>Отмена</button></div>
  </div></div>;
}
