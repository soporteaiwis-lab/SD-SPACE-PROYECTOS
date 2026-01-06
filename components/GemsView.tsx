import React, { useState, useEffect } from 'react';
import { Gem, User, UserRole } from '../types';

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <i className={`fa-solid ${name} ${className}`}></i>
);

interface GemsViewProps {
    gems: Gem[];
    onAddGem: (g: Gem) => void;
    onUpdateGem: (g: Gem) => void;
    onDeleteGem: (id: string) => void;
    currentUser: User;
}

export const GemsView = ({ gems, onAddGem, onUpdateGem, onDeleteGem, currentUser }: GemsViewProps) => {
  const [showModal, setShowModal] = useState(false);
  const [editingGem, setEditingGem] = useState<Gem | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', url: '', icon: '' });

  const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CEO;

  // ESC Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
          setShowModal(false);
          setEditingGem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openAdd = () => {
      setEditingGem(null);
      setFormData({ name: '', description: '', url: '', icon: '' });
      setShowModal(true);
  };

  const openEdit = (g: Gem) => {
      setEditingGem(g);
      setFormData({ name: g.name, description: g.description, url: g.url, icon: g.icon });
      setShowModal(true);
  };

  const handleDelete = (id: string) => {
      if(confirm('¿Seguro que deseas eliminar esta Gema?')) {
          onDeleteGem(id);
      }
  };

  const handleSave = () => {
    if (!formData.name || !formData.url) return;
    
    if (editingGem) {
        onUpdateGem({ ...editingGem, ...formData });
    } else {
        onAddGem({ id: 'g' + Date.now(), ...formData });
    }
    
    setShowModal(false);
    setEditingGem(null);
  };

  return (
    <div className="space-y-6 print:hidden pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-SIMPLEDATA-900">Mis Gemas</h2>
        {isAdmin && (
            <button onClick={openAdd} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Icon name="fa-plus" className="mr-2" /> <span className="hidden md:inline">Agregar Gema</span>
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gems.map(gem => (
           <div key={gem.id} className="bg-SIMPLEDATA-800 text-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 relative group min-h-[200px] flex flex-col">
              
              {/* Admin Controls - ALWAYS VISIBLE NOW */}
              {isAdmin && (
                  <div className="absolute top-2 right-2 flex gap-1 z-20">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(gem); }} className="w-8 h-8 bg-black/40 hover:bg-black rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors" title="Editar"><Icon name="fa-pen" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(gem.id); }} className="w-8 h-8 bg-red-600/40 hover:bg-red-600 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors" title="Eliminar"><Icon name="fa-trash" /></button>
                  </div>
              )}

              <div className="h-32 bg-gradient-to-br from-SIMPLEDATA-600 to-SIMPLEDATA-900 flex items-center justify-center relative p-4">
                 <Icon name={gem.icon || 'fa-brain'} className="text-5xl text-white/20 absolute z-0" />
                 <h3 className="text-xl font-bold font-sans z-10 text-center uppercase leading-tight">{gem.name}</h3>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between bg-SIMPLEDATA-800">
                 <p className="text-slate-300 text-xs mb-4 line-clamp-2">{gem.description}</p>
                 <a href={gem.url} target="_blank" className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-center rounded text-sm transition-colors font-medium border border-white/10">
                    <Icon name="fa-bolt" className="mr-2" /> Usar Gema
                 </a>
              </div>
           </div>
        ))}
      </div>
       
       {/* OPTIMIZED MODAL */}
       {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-slate-800 flex flex-col md:max-h-[90vh] animate-scale-up">
            <h3 className="text-lg font-bold mb-4 shrink-0">{editingGem ? 'Editar Gema' : 'Agregar Gema'}</h3>
            <div className="space-y-3 overflow-y-auto flex-1">
              <input className="w-full border p-2 rounded-lg text-sm" placeholder="Nombre" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input className="w-full border p-2 rounded-lg text-sm" placeholder="Descripción" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              <input className="w-full border p-2 rounded-lg text-sm" placeholder="URL" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} />
              <input className="w-full border p-2 rounded-lg text-sm" placeholder="Icono (fa-icon)" value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2 mt-4 shrink-0">
              <button onClick={() => {setShowModal(false); setEditingGem(null);}} className="text-slate-500 text-sm px-3 py-2">Cancelar</button>
              <button onClick={handleSave} className="bg-SIMPLEDATA-600 text-white text-sm px-4 py-2 rounded-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};