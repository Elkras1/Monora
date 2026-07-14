import React, { useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { useApp } from '../state/AppContext';

/** Admin/Manager: einfache Artikelliste für die Materialbestellung pflegen ("Artikel verwalten") —
 * hinzufügen, umbenennen, aktivieren/deaktivieren, löschen (sofern nicht in bestehenden Bestellungen verwendet). */
export function MaterialCatalogModal({ onClose }: { onClose: () => void }) {
  const { state, actions } = useApp();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    actions.saveMaterial({ name }, null);
    setNewName('');
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveEdit = () => {
    const name = editingName.trim();
    if (editingId && name) actions.saveMaterial({ name }, editingId);
    setEditingId(null);
    setEditingName('');
  };

  return (
    <Modal title="Artikel verwalten" onClose={onClose}>
      <div className="field-row">
        <input
          placeholder="Neuer Artikel"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={add} disabled={!newName.trim()}>
          <Icon name="plus" /> Hinzufügen
        </button>
      </div>

      <div className="material-catalog-list" style={{ marginTop: 14 }}>
        {state.materials.map((mat) => (
          <div key={mat.id} className="material-catalog-row">
            {editingId === mat.id ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                onBlur={saveEdit}
                style={{ flex: 1 }}
              />
            ) : (
              <span className="material-catalog-name" onClick={() => startEdit(mat.id, mat.name)}>
                {mat.name}
              </span>
            )}
            <span className={`toggle ${mat.active ? 'on' : ''}`} onClick={() => actions.toggleMaterialActive(mat.id)}>
              <span className="toggle-knob" />
            </span>
            <button className="icon-btn" title="Löschen" onClick={() => actions.deleteMaterial(mat.id)}>
              <Icon name="trash" />
            </button>
          </div>
        ))}
        {!state.materials.length ? <div className="hint">Noch keine Artikel angelegt.</div> : null}
      </div>
    </Modal>
  );
}
