import React, { useState } from 'react';
import { Project } from '../types';

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <i className={`fa-solid ${name} ${className}`}></i>
);

export const UploadAssistantModal = ({ 
  file, 
  project, 
  type, 
  onClose, 
  onConfirm 
}: { 
  file: File, 
  project: Project, 
  type: 'drive' | 'github', 
  onClose: () => void, 
  onConfirm: () => void 
}) => {
  const repo = project.repositories?.find(r => r.type === type);
  const targetUrl = repo?.url || (type === 'drive' ? 'https://drive.google.com' : 'https://github.com');
  const [step, setStep] = useState(1);

  const handleOpenLink = () => {
    window.open(targetUrl, '_blank');
    setStep(2);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-[500px] shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><Icon name="fa-times" /></button>
        
        <div className="text-center mb-6">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-4 ${type === 'drive' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-800'}`}>
            <Icon name={type === 'drive' ? 'fab fa-google-drive' : 'fab fa-github'} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Asistente de Carga Segura</h3>
          <p className="text-sm text-slate-500 mt-1">Sincronizando con {type === 'drive' ? 'Google Drive' : 'GitHub'}</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex items-center gap-3">
          <Icon name="fa-file" className="text-slate-400 text-xl" />
          <div className="overflow-hidden">
             <p className="text-xs font-bold text-slate-500 uppercase">Archivo Seleccionado</p>
             <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
             <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>

        <div className="space-y-4">
           <div className={`transition-opacity duration-300 ${step === 1 ? 'opacity-100' : 'opacity-50'}`}>
              <button 
                onClick={handleOpenLink}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 ${type === 'drive' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}
              >
                <Icon name="fa-external-link-alt" /> 1. Abrir Carpeta de Destino
              </button>
              <p className="text-xs text-center text-slate-500 mt-2">
                Se abrirá una nueva pestaña. <strong>Arrastra el archivo ahí.</strong>
              </p>
           </div>

           {step === 2 && (
             <div className="animate-slide-up border-t border-slate-100 pt-4 mt-4">
                <p className="text-sm text-center text-slate-700 mb-4 font-medium">¿Ya soltaste el archivo en la carpeta?</p>
                <button 
                  onClick={onConfirm}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                >
                  <Icon name="fa-check-circle" /> 2. Confirmar y Registrar
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};