import { useState } from 'react';
import type { Revision } from '../domain/types';

interface Props { revisions: Revision[]; editorName: string; onEditorName(value: string): void; onClose(): void; onRestore(id: string): void; }

export function HistoryPanel({ revisions, editorName, onEditorName, onClose, onRestore }: Props) {
  const [selected, setSelected] = useState(revisions.at(-1)?.id ?? '');
  const current = revisions.find(item => item.id === selected);
  return <div className="drawer-scrim" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="drawer history-drawer" aria-label="История изменений">
      <div className="drawer-heading"><div><span className="eyebrow">ВЕРСИИ ПЛАНА</span><h2>История изменений</h2></div><button className="icon-button" onClick={onClose} aria-label="Закрыть">×</button></div>
      <label className="field">Имя редактора в журнале<input value={editorName} onChange={event => onEditorName(event.target.value)} placeholder="Необязательно" /></label>
      <div className="history-list">{[...revisions].reverse().map(revision => <button key={revision.id} className={`history-item ${selected === revision.id ? 'selected' : ''}`} onClick={() => setSelected(revision.id)}><span className="history-pin" /><span><strong>{revision.action}</strong><small>{new Date(revision.at).toLocaleString('ru-RU')} · {revision.editorName || 'Без подписи'}</small></span></button>)}</div>
      {current && <div className="history-preview"><span className="eyebrow">ВЫБРАННАЯ ВЕРСИЯ</span><strong>{current.planSnapshot.title}</strong><span>{current.planSnapshot.tasks.length} задач · {current.planSnapshot.rangeStart} — {current.planSnapshot.rangeEnd}</span><button className="outline-button" onClick={() => { if (window.confirm('Восстановить выбранную версию? Текущая версия останется в истории.')) onRestore(current.id); }}>Восстановить эту версию</button></div>}
    </aside>
  </div>;
}
