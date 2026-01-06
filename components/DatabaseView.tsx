import React, { useState, useEffect } from 'react';
import { User, Project, Gem, Tool, UserRole } from '../types';

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <i className={`fa-solid ${name} ${className}`}></i>
);

// Constants for LocalStorage Keys used in dbService
const DB_KEYS = {
    'USERS': 'SIMPLEDATA_users_v1',
    'PROJECTS': 'SIMPLEDATA_projects_v1',
    'USED_IDS': 'SIMPLEDATA_used_ids_v1', // NEW EXPOSED TABLE
    'GEMS': 'SIMPLEDATA_gems_v1',
    'TOOLS': 'SIMPLEDATA_tools_v1',
    'CONFIG_API': 'SIMPLEDATA_env_API_KEY',
    'CONFIG_GH': 'SIMPLEDATA_env_GITHUB_TOKEN'
};

export const DatabaseView = () => {
  const [activeTable, setActiveTable] = useState<string>('USERS');
  const [tableData, setTableData] = useState<any[]>([]);
  const [rawJson, setRawJson] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [statusMsg, setStatusMsg] = useState('');
  const [consoleOutput, setConsoleOutput] = useState<string[]>(['> Sistema de Base de Datos Iniciado...', '> Conectado a LocalStorage Driver.']);

  useEffect(() => {
      loadTable(activeTable);
  }, [activeTable]);

  const addToConsole = (msg: string) => {
      setConsoleOutput(prev => [`> ${msg}`, ...prev]);
  };

  const loadTable = (key: string) => {
      const dataStr = localStorage.getItem(DB_KEYS[key as keyof typeof DB_KEYS]);
      if (dataStr) {
          try {
              const parsed = JSON.parse(dataStr);
              // Ensure it's array for table view
              const asArray = Array.isArray(parsed) ? parsed : [parsed]; 
              setTableData(asArray);
              setRawJson(JSON.stringify(parsed, null, 2));
              addToConsole(`CargSIMPLEDATA tabla: ${key} (${asArray.length} registros)`);
          } catch (e) {
              setTableData([]);
              setRawJson(dataStr); // It might be a plain string (like API Key)
              addToConsole(`Cargado valor escalar: ${key}`);
          }
      } else {
          setTableData([]);
          setRawJson('[]');
          addToConsole(`Tabla vacía o inexistente: ${key}`);
      }
  };

  const handleSaveJson = () => {
      try {
          // Validation
          const parsed = JSON.parse(rawJson);
          localStorage.setItem(DB_KEYS[activeTable as keyof typeof DB_KEYS], rawJson);
          
          setStatusMsg('✅ Datos guardados y confirmados.');
          addToConsole(`UPDATE ${activeTable} SUCCESS. Commit realizado en LocalStorage.`);
          
          // Reload table view
          loadTable(activeTable);
          
          // Clear success msg after 3s
          setTimeout(() => setStatusMsg(''), 3000);
      } catch (e: any) {
          setStatusMsg('❌ Error de Sintaxis JSON: ' + e.message);
          addToConsole(`ERROR: Transacción fallida. JSON inválido.`);
      }
  };

  const generateSQL = () => {
      if (tableData.length === 0) {
          alert("No hay datos para exportar.");
          return;
      }
      
      try {
          const tableName = activeTable.toLowerCase();
          let sql = `-- Exportado desde SIMPLEDATA Portal para ${tableName}\n`;
          
          tableData.forEach(row => {
              const columns = Object.keys(row).join(', ');
              const values = Object.values(row).map(val => {
                  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                  if (typeof val === 'object') return `'${JSON.stringify(val)}'`; // Store objects as JSON string
                  return val;
              }).join(', ');
              sql += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
          });
          
          // Copy to clipboard or show in modal
          navigator.clipboard.writeText(sql);
          alert("SQL copiado al portapapeles. Listo para pgAdmin/DBeaver.");
          addToConsole(`DUMP SQL generado para ${tableName}.`);
      } catch (e) {
          alert("Error generando SQL. Revisa que sea una tabla válida.");
      }
  };

  const renderValue = (val: any) => {
      if (typeof val === 'object') return <span className="text-xs text-slate-400 font-mono">{JSON.stringify(val).substring(0, 30)}...</span>;
      if (typeof val === 'boolean') return val ? <span className="text-green-500">TRUE</span> : <span className="text-red-500">FALSE</span>;
      return String(val);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 text-slate-300 font-sans">
        {/* Toolbar */}
        <div className="bg-slate-800 p-3 border-b border-slate-700 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <Icon name="fa-database" className="text-orange-500 text-xl" />
                <h2 className="font-bold text-white">Gestor de Base de Datos</h2>
                <div className="h-6 w-[1px] bg-slate-600 mx-2"></div>
                <div className="flex gap-1 bg-slate-900 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('table')} 
                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-orange-600 text-white' : 'hover:bg-slate-700'}`}
                    >
                        <Icon name="fa-table" className="mr-1"/> GRID
                    </button>
                    <button 
                        onClick={() => setViewMode('json')} 
                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'json' ? 'bg-orange-600 text-white' : 'hover:bg-slate-700'}`}
                    >
                        <Icon name="fa-code" className="mr-1"/> JSON EDIT
                    </button>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button onClick={generateSQL} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded flex items-center gap-2 border border-slate-600">
                    <Icon name="fa-file-export"/> Exportar SQL
                </button>
                <button onClick={() => window.location.reload()} className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800 text-red-200 text-xs font-bold rounded flex items-center gap-2 border border-red-800">
                    <Icon name="fa-sync"/> Reiniciar Sistema
                </button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tables */}
            <div className="w-48 bg-slate-800 border-r border-slate-700 flex flex-col">
                <div className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tablas (Collections)</div>
                <div className="flex-1 overflow-y-auto">
                    {Object.keys(DB_KEYS).map(key => (
                        <button 
                            key={key}
                            onClick={() => setActiveTable(key)}
                            className={`w-full text-left px-4 py-3 text-xs font-mono flex items-center gap-2 border-l-4 transition-colors ${activeTable === key ? 'bg-slate-700 border-orange-500 text-white' : 'border-transparent text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                        >
                            <Icon name={key.includes('CONFIG') ? "fa-cog" : "fa-table"} /> {key}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden relative">
                
                {/* Status Bar */}
                {statusMsg && (
                    <div className={`absolute top-4 right-4 z-10 px-4 py-2 rounded shadow-lg text-sm font-bold animate-fade-in ${statusMsg.includes('Error') ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                        {statusMsg}
                    </div>
                )}

                {viewMode === 'table' && (
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-800 text-slate-400 sticky top-0 z-10 font-mono">
                                <tr>
                                    <th className="p-3 border-b border-slate-700 w-10">#</th>
                                    {tableData.length > 0 && Object.keys(tableData[0]).map(k => (
                                        <th key={k} className="p-3 border-b border-slate-700 border-r border-slate-700 min-w-[100px] whitespace-nowrap">{k}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                                {tableData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-800/50">
                                        <td className="p-2 border-r border-slate-800 text-slate-500 text-center">{idx + 1}</td>
                                        {Object.values(row).map((val, i) => (
                                            <td key={i} className="p-2 border-r border-slate-800 truncate max-w-[200px]" title={String(val)}>
                                                {renderValue(val)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {tableData.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="p-8 text-center text-slate-600">
                                            <Icon name="fa-box-open" className="text-4xl mb-2"/>
                                            <p>Tabla vacía o datos no estructurados.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {viewMode === 'json' && (
                    <div className="flex-1 flex flex-col">
                        <div className="bg-slate-950 text-slate-500 text-xs px-2 py-1 flex justify-between">
                            <span>Editor JSON - {activeTable}</span>
                            <span>{rawJson.length} caracteres</span>
                        </div>
                        <textarea 
                            className="flex-1 bg-slate-900 text-green-400 font-mono text-sm p-4 outline-none resize-none"
                            value={rawJson}
                            onChange={e => setRawJson(e.target.value)}
                            spellCheck={false}
                        />
                        <div className="p-3 bg-slate-800 border-t border-slate-700 flex justify-end gap-3">
                            <button onClick={() => loadTable(activeTable)} className="text-slate-400 hover:text-white text-xs font-bold">Descartar Cambios</button>
                            <button onClick={handleSaveJson} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2">
                                <Icon name="fa-save" /> GUARDAR CAMBIOS (COMMIT)
                            </button>
                        </div>
                    </div>
                )}

                {/* Console Output */}
                <div className="h-32 bg-black border-t border-slate-700 p-2 font-mono text-xs overflow-y-auto shrink-0">
                    {consoleOutput.map((line, i) => (
                        <div key={i} className="text-slate-400 mb-1 border-b border-slate-900 pb-1">{line}</div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};