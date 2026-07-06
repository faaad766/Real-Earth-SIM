// Save Universe dialog — name input + slot picker (fixed: live slot data, correct empty-slot save)
import { useState, useEffect } from 'react';
import { Save, X, Trash2, Clock, Dna, Users, FolderOpen } from 'lucide-react';
import { useUIStore } from '@/store/UIStore';
import { PersistenceManager, type SaveSlot } from '@/lib/PersistenceManager';

function formatTimestamp(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatYear(y: number) {
  if (y < 10000) return `Yr ${y.toLocaleString()}`;
  if (y < 1_000_000) return `${(y / 1000).toFixed(1)}k yr`;
  return `${(y / 1_000_000).toFixed(2)}M yr`;
}

export function SaveDialog() {
  const { saveDialogOpen, setSaveDialogOpen, addNotification, simYear, totalPop, activeSpecies } = useUIStore();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState<number | null>(null);
  // Local copy of slots so we can refresh on demand
  const [slots, setSlots] = useState<Array<SaveSlot | null>>([null, null, null, null, null]);

  // Always load fresh slot data when dialog opens
  useEffect(() => {
    if (saveDialogOpen) {
      setSlots(PersistenceManager.getAllSlots());
      setName('');
    }
  }, [saveDialogOpen]);

  if (!saveDialogOpen) return null;

  const worldName = name.trim() || `Universe ${new Date().toLocaleDateString()}`;

  const doSave = (slot: number) => {
    if (saving !== null) return;
    setSaving(slot);
    const ok = PersistenceManager.saveToSlot(slot, worldName);
    setTimeout(() => {
      setSaving(null);
      // Refresh slot data immediately after save
      setSlots(PersistenceManager.getAllSlots());
      if (ok) {
        addNotification(`💾 Saved "${worldName}" to slot ${slot + 1}`, 'success');
        setSaveDialogOpen(false);
        setName('');
      } else {
        addNotification('❌ Save failed — try again', 'error');
      }
    }, 300);
  };

  const doDelete = (slot: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete save in slot ${slot + 1}?`)) return;
    PersistenceManager.deleteSlot(slot);
    setSlots(PersistenceManager.getAllSlots());
  };

  // Find first empty slot for Enter-key quick-save
  const firstEmpty = slots.findIndex(s => s === null);
  const quickSaveSlot = firstEmpty >= 0 ? firstEmpty : 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
      onClick={() => setSaveDialogOpen(false)}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10,12,22,0.99)',
          border: '1px solid rgba(0,229,192,0.2)',
          boxShadow: '0 0 80px rgba(0,229,192,0.08), 0 32px 80px rgba(0,0,0,0.9)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Save size={16} style={{ color: '#00E5C0' }} />
            <span style={{ fontFamily: 'Space Grotesk', color: '#00E5C0', fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.04em' }}>
              Save Universe
            </span>
          </div>
          <button onClick={() => setSaveDialogOpen(false)} className="p-1 rounded hover:bg-white/5 transition-colors">
            <X size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </button>
        </div>

        {/* Current world snapshot */}
        <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,229,192,0.03)' }}>
          <p style={{ fontFamily: 'Space Grotesk', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
            Current World
          </p>
          <div className="flex items-center gap-5">
            <SnapshotStat icon={<Clock size={11} />} label="Time" value={formatYear(simYear)} />
            <SnapshotStat icon={<Users size={11} />} label="Population" value={totalPop.toLocaleString()} />
            <SnapshotStat icon={<Dna size={11} />} label="Species" value={activeSpecies.toString()} />
          </div>
        </div>

        {/* Name input */}
        <div className="px-5 pt-4 pb-3">
          <label style={{ fontFamily: 'Space Grotesk', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            World Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={`Universe ${new Date().toLocaleDateString()}`}
            maxLength={48}
            autoFocus
            className="w-full px-3 py-2 rounded-lg outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.9)',
              fontFamily: 'Space Grotesk',
              fontSize: '0.85rem',
            }}
            onKeyDown={e => { if (e.key === 'Enter') doSave(quickSaveSlot); }}
          />
          <p style={{ fontFamily: 'Inter', fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
            Press Enter to save to {firstEmpty >= 0 ? `slot ${firstEmpty + 1}` : 'slot 1 (overwrite)'}
          </p>
        </div>

        {/* Slots */}
        <div className="px-5 pb-5 space-y-1.5">
          <div style={{ fontFamily: 'Space Grotesk', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FolderOpen size={10} /> Select Save Slot
          </div>
          {[0, 1, 2, 3, 4].map(slot => {
            const meta = slots[slot];
            const isSaving = saving === slot;
            return (
              <button
                key={slot}
                onClick={() => doSave(slot)}
                disabled={saving !== null}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group"
                style={{
                  background: isSaving ? 'rgba(0,229,192,0.12)' : meta ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
                  border: `1px solid ${isSaving ? 'rgba(0,229,192,0.4)' : meta ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                  opacity: saving !== null && !isSaving ? 0.5 : 1,
                }}
              >
                {/* Slot number badge */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: meta ? 'rgba(0,229,192,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${meta ? 'rgba(0,229,192,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', color: meta ? '#00E5C0' : 'rgba(255,255,255,0.2)' }}>
                    {slot + 1}
                  </span>
                </div>

                {/* Slot content */}
                {meta ? (
                  <div className="flex-1 min-w-0 text-left">
                    <div className="truncate" style={{ fontFamily: 'Space Grotesk', fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                      {meta.name}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                      {formatTimestamp(meta.timestamp)} · {formatYear(meta.year)} · {meta.species} sp · {meta.population.toLocaleString()} org
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 text-left">
                    <span style={{ fontFamily: 'Space Grotesk', fontSize: '0.72rem', color: 'rgba(255,255,255,0.18)', fontStyle: 'italic' }}>
                      Empty slot — click to save here
                    </span>
                  </div>
                )}

                {/* Save spinner */}
                {isSaving && (
                  <div
                    className="w-3.5 h-3.5 rounded-full border-2 animate-spin shrink-0"
                    style={{ borderColor: 'rgba(0,229,192,0.3)', borderTopColor: '#00E5C0' }}
                  />
                )}

                {/* Delete button (only on filled, non-saving slots) */}
                {meta && !isSaving && (
                  <button
                    onClick={e => doDelete(slot, e)}
                    className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'rgba(255,100,100,0.5)' }}
                    title={`Delete slot ${slot + 1}`}
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SnapshotStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color: '#00E5C0', opacity: 0.6 }}>{icon}</span>
      <div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>{value}</div>
        <div style={{ fontFamily: 'Space Grotesk', fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  );
}