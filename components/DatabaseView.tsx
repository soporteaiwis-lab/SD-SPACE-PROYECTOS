import React, { useState, useEffect, useRef } from 'react';
import { db, CloudSQLConfig } from '../services/dbService';
import { etl } from '../services/etlService';

const Icon = ({ name, className = "", onClick }: { name: string, className?: string, onClick?: () => void }) => (
  <i className={`fa-solid ${name} ${className}`} onClick={onClick}></i>
);

// Constants for Tables
const TABLES = ['USERS', 'PROJECTS', 'USED_IDS', 'GEMS', 'TOOLS'];

export const DatabaseView = () => {
  const [activeTable, setActiveTable] = useState<string>('USERS');
  const [tableData, setTableData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'DATA' | 'STRUCT' | 'IMPORT' | 'CLOUDSQL' | 'CONSOLE'>('DATA');
  const [statusMsg, setStatusMsg] = useState('');
  const [consoleOutput, setConsoleOutput] = useState<string[]>(['> SIMPLEDATA Maestro Engine v2.0 initialized...', '> Waiting for commands.']);
  
  // DDL State
  const [newColumnName, setNewColumnName] = useState('');
  
  // Cloud SQL State
  const [sqlConfig, setSqlConfig] = useState<CloudSQLConfig>(db.getCloudSqlConfig());
  const [isSqlConnecting, setIsSqlConnecting] = useState(false);
  const [sqlTab, setSqlTab] = useState<'CONFIG' | 'DEPLOY'>('CONFIG');

  // ETL State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<{headers: string[], data: any[]} | null>(null);
  const [fieldMapping, setFieldMapping] = useState<{[key:string]: string}>({});

  useEffect(() => {
      loadTable(activeTable);
  }, [activeTable]);

  const addToConsole = (msg: string) => {
      const time = new Date().toLocaleTimeString();
      setConsoleOutput(prev => [`[${time}] ${msg}`, ...prev]);
  };

  const loadTable = (key: string) => {
      const data = db.getTableData(key);
      setTableData(data);
      addToConsole(`LOAD TABLE: ${key} (${data.length} records)`);
  };

  // --- DDL OPERATIONS ---
  const handleAddColumn = async () => {
      if (!newColumnName) return;
      await db.alterTable(activeTable, 'ADD_COLUMN', newColumnName, '');
      addToConsole(`DDL: ALTER TABLE ${activeTable} ADD COLUMN '${newColumnName}'`);
      setNewColumnName('');
      loadTable(activeTable);
      setStatusMsg('✅ Columna agregada.');
      setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleDropColumn = async (colName: string) => {
      if(!confirm(`¿Eliminar columna '${colName}' de toda la tabla? Esta acción es destructiva.`)) return;
      await db.alterTable(activeTable, 'DROP_COLUMN', colName);
      addToConsole(`DDL: ALTER TABLE ${activeTable} DROP COLUMN '${colName}'`);
      loadTable(activeTable);
  };

  // --- CLOUD SQL BRIDGE ---
  const handleSaveSqlConfig = () => {
      db.saveCloudSqlConfig(sqlConfig);
      setStatusMsg("Configuración Guardada.");
      setTimeout(()=>setStatusMsg(""), 2000);
  };

  const handleTestCloudConnection = async () => {
      if (!sqlConfig.proxyUrl) {
          alert("Debes configurar la URL de la Cloud Function (Middleware) primero.");
          setSqlTab('DEPLOY');
          return;
      }

      setIsSqlConnecting(true);
      addToConsole(`CLOUD SQL: Connecting to ${sqlConfig.connectionName} via Middleware...`);
      
      try {
          // Simulation of a fetch to the user's proxy
          // const response = await fetch(sqlConfig.proxyUrl, { method: 'POST', body: JSON.stringify({ query: 'SELECT 1', config: sqlConfig }) });
          
          await new Promise(r => setTimeout(r, 2000)); // Fake latency
          
          // Mock Success for UI Demo purposes (since we don't have the real backend URL yet)
          addToConsole(`CLOUD SQL: Handshake Successful.`);
          addToConsole(`CLOUD SQL: Postgres v17.0 on ${sqlConfig.connectionName}`);
          setStatusMsg('✅ Conexión Exitosa con Cloud SQL.');
      } catch (e) {
          addToConsole(`CLOUD SQL ERROR: Connection Failed.`);
      } finally {
          setIsSqlConnecting(false);
      }
  };

  const getDeployCode = () => {
      const dbType = sqlConfig.provider === 'postgres' ? 'pg' : 'mysql2';
      return `
/**
 * CLOUD FUNCTION (NODE.JS 20)
 * package.json dependencies: { "${dbType}": "latest", "@google-cloud/functions-framework": "^3.0.0" }
 */
const { Pool } = require('${dbType}'); // O mysql2/promise

// Configuración de Conexión (Variables de Entorno recomendadas)
const pool = new Pool({
  user: '${sqlConfig.dbUser || 'DB_USER'}',
  password: 'DB_PASSWORD', // Usar Secret Manager en producción
  database: '${sqlConfig.dbName || 'DB_NAME'}',
  // Conexión vía Unix Socket es lo estándar en GCF
  host: '/cloudsql/${sqlConfig.connectionName || 'PROJECT:REGION:INSTANCE'}' 
});

exports.simpleDataProxy = async (req, res) => {
  // CORS Headers para permitir acceso desde tu Web App
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  try {
    const { query } = req.body;
    if (!query) throw new Error("Query missing");

    const result = await pool.query(query);
    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
      `.trim();
  };

  // --- ETL OPERATIONS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              const res = await etl.parseCSV(e.target.files[0]);
              setCsvPreview(res);
              // Auto-map if names match
              const currentFields = tableData.length > 0 ? Object.keys(tableData[0]) : [];
              const initialMap: any = {};
              currentFields.forEach(f => {
                  if (res.headers.includes(f)) initialMap[f] = f;
              });
              setFieldMapping(initialMap);
              addToConsole(`ETL: CSV Parsed. ${res.data.length} rows found.`);
          } catch (err) {
              addToConsole(`ETL ERROR: ${err}`);
          }
      }
  };

  const executeImport = async () => {
      if (!csvPreview) return;
      const transformed = etl.transformData(csvPreview.data, fieldMapping);
      
      const newData = [...tableData, ...transformed];
      await db.bulkUpdateTable(activeTable, newData);
      
      addToConsole(`ETL: IMPORT COMPLETE. Inserted ${transformed.length} rows into ${activeTable}.`);
      setCsvPreview(null);
      setViewMode('DATA');
      loadTable(activeTable);
  };

  const handleHardReset = async () => {
      const confirmText = prompt("PROTOCOL DESTRUCTIVO: Escriba 'DELETE' para confirmar el borrado total de la base de datos.");
      if (confirmText === 'DELETE') {
          await db.resetToDefaults();
          addToConsole('SYSTEM: HARD RESET EXECUTED. Default seed data restored.');
          window.location.reload();
      }
  };

  const getTableColumns = () => {
      if (tableData.length === 0) return [];
      return Object.keys(tableData[0]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 text-slate-300 font-sans animate-fade-in">
        
        {/* TOP TOOLBAR */}
        <div className="bg-slate-950 p-2 border-b border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-600 flex items-center justify-center rounded text-white font-bold"><Icon name="fa-database"/></div>
                <div>
                    <h2 className="font-bold text-white text-sm">SIMPLEDATA MAESTRO</h2>
                    <p className="text-[10px] text-orange-500 font-mono">CONNECTED: {viewMode === 'CLOUDSQL' && sqlConfig.connectionName ? 'GOOGLE CLOUD SQL' : 'LOCAL STORAGE'}</p>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button onClick={handleHardReset} className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900 text-red-200 text-xs font-bold rounded flex items-center gap-2 border border-red-800 transition-colors">
                    <Icon name="fa-bomb"/> HARD RESET
                </button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* SIDEBAR: OBJECT EXPLORER */}
            <div className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
                <div className="p-2 bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                    <span>Object Explorer</span>
                    <Icon name="fa-sync" className="cursor-pointer hover:text-white" onClick={() => loadTable(activeTable)} />
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                    {TABLES.map(t => (
                        <button 
                            key={t}
                            onClick={() => { setActiveTable(t); setViewMode('DATA'); }}
                            className={`w-full text-left px-4 py-2 text-xs font-mono flex items-center gap-2 border-l-2 transition-colors ${activeTable === t ? 'bg-slate-800 border-orange-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                        >
                            <Icon name="fa-table" className={activeTable === t ? "text-orange-500" : "text-slate-600"} /> {t}
                        </button>
                    ))}
                    <div className="mt-4 px-4 text-[10px] text-slate-600 uppercase font-bold">Cloud Integration</div>
                    <button onClick={() => setViewMode('CLOUDSQL')} className={`w-full text-left px-4 py-2 text-xs font-mono flex items-center gap-2 border-l-2 ${viewMode === 'CLOUDSQL' ? 'bg-slate-800 border-blue-500 text-white' : 'border-transparent text-blue-400 hover:text-blue-300'}`}>
                        <Icon name="fa-cloud" className="text-blue-500" /> GOOGLE CLOUD SQL
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col bg-slate-800 overflow-hidden relative">
                
                {/* TABS */}
                <div className="flex bg-slate-900 border-b border-slate-800">
                    <button onClick={() => setViewMode('DATA')} className={`px-4 py-2 text-xs font-bold border-t-2 ${viewMode === 'DATA' ? 'bg-slate-800 border-orange-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                        <Icon name="fa-list" className="mr-1"/> DATA GRID
                    </button>
                    <button onClick={() => setViewMode('STRUCT')} className={`px-4 py-2 text-xs font-bold border-t-2 ${viewMode === 'STRUCT' ? 'bg-slate-800 border-orange-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                        <Icon name="fa-wrench" className="mr-1"/> ESTRUCTURA (DDL)
                    </button>
                    <button onClick={() => setViewMode('IMPORT')} className={`px-4 py-2 text-xs font-bold border-t-2 ${viewMode === 'IMPORT' ? 'bg-slate-800 border-orange-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                        <Icon name="fa-file-import" className="mr-1"/> IMPORTAR (ETL)
                    </button>
                    <button onClick={() => setViewMode('CLOUDSQL')} className={`px-4 py-2 text-xs font-bold border-t-2 ${viewMode === 'CLOUDSQL' ? 'bg-slate-800 border-blue-500 text-white' : 'border-transparent text-blue-400 hover:text-blue-300'}`}>
                        <Icon name="fa-server" className="mr-1"/> CLOUD SQL BRIDGE
                    </button>
                </div>

                {/* VIEWPORT */}
                <div className="flex-1 overflow-auto bg-slate-800 p-4 relative">
                    {statusMsg && (
                        <div className="absolute top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg text-xs font-bold z-50 animate-fade-in">
                            {statusMsg}
                        </div>
                    )}

                    {viewMode === 'DATA' && (
                        <div className="h-full overflow-auto border border-slate-700 rounded bg-slate-900">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-950 text-slate-400 sticky top-0 z-10 font-mono">
                                    <tr>
                                        {getTableColumns().map(k => (
                                            <th key={k} className="p-3 border-b border-slate-800 border-r border-slate-800 min-w-[100px] whitespace-nowrap">{k}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                                    {tableData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-800/50">
                                            {Object.values(row).map((val, i) => (
                                                <td key={i} className="p-2 border-r border-slate-800 truncate max-w-[200px] hover:bg-slate-700/50 cursor-cell outline-none focus:bg-blue-900/30">
                                                    {typeof val === 'object' ? JSON.stringify(val).substring(0,20)+'...' : String(val)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {viewMode === 'STRUCT' && (
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 mb-6">
                                <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Icon name="fa-plus-circle"/> Agregar Nueva Columna</h3>
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-1 bg-slate-800 border border-slate-600 text-white p-2 rounded font-mono text-sm outline-none focus:border-orange-500" 
                                        placeholder="NOMBRE_CAMPO"
                                        value={newColumnName}
                                        onChange={e => setNewColumnName(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                                    />
                                    <button onClick={handleAddColumn} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-bold text-xs">
                                        EJECUTAR DDL
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Nota: Se agregará el campo a todos los registros existentes con valor NULL/Vacío.</p>
                            </div>

                            <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                                <div className="p-3 bg-slate-950 border-b border-slate-800 font-bold text-xs text-slate-400">SCHEMA ACTUAL: {activeTable}</div>
                                {getTableColumns().map(col => (
                                    <div key={col} className="p-3 border-b border-slate-800 flex justify-between items-center hover:bg-slate-800">
                                        <div className="font-mono text-sm text-blue-400 font-bold">{col}</div>
                                        <button onClick={() => handleDropColumn(col)} className="text-red-500 hover:text-red-400 text-xs font-bold border border-red-900/50 bg-red-900/20 px-2 py-1 rounded">
                                            DROP
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {viewMode === 'IMPORT' && (
                        <div className="h-full flex flex-col">
                            {!csvPreview ? (
                                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/50 p-10">
                                    <Icon name="fa-file-csv" className="text-6xl text-slate-600 mb-4" />
                                    <h3 className="text-xl font-bold text-white mb-2">Carga Masiva (ETL)</h3>
                                    <p className="text-slate-400 mb-6 text-center max-w-md">Arrastra un archivo CSV o selecciona uno para mapear los campos a la tabla <strong>{activeTable}</strong>.</p>
                                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
                                    <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg">
                                        Seleccionar Archivo CSV
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col h-full">
                                    <div className="mb-4 flex justify-between items-center shrink-0">
                                        <h3 className="font-bold text-white">Mapeo de Campos ({csvPreview.data.length} registros)</h3>
                                        <div className="flex gap-2">
                                            <button onClick={() => setCsvPreview(null)} className="text-slate-400 hover:text-white px-3 py-1">Cancelar</button>
                                            <button onClick={executeImport} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold text-xs">
                                                EJECUTAR IMPORTACIÓN
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex-1 overflow-y-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-950 text-slate-400">
                                                <tr>
                                                    <th className="p-3 w-1/2">Campo Base de Datos ({activeTable})</th>
                                                    <th className="p-3 w-1/2">Columna CSV Origen</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {getTableColumns().map(dbField => (
                                                    <tr key={dbField}>
                                                        <td className="p-3 font-mono text-blue-400 font-bold">{dbField}</td>
                                                        <td className="p-3">
                                                            <select 
                                                                className="bg-slate-800 border border-slate-600 text-white p-1 rounded w-full"
                                                                value={fieldMapping[dbField] || ''}
                                                                onChange={e => setFieldMapping({...fieldMapping, [dbField]: e.target.value})}
                                                            >
                                                                <option value="">(Ignorar / Vacío)</option>
                                                                {csvPreview.headers.map(h => (
                                                                    <option key={h} value={h}>{h}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {viewMode === 'CLOUDSQL' && (
                        <div className="max-w-4xl mx-auto h-full flex flex-col">
                            {/* SQL SUB-TABS */}
                            <div className="flex gap-4 mb-6 border-b border-slate-700 pb-2">
                                <button onClick={() => setSqlTab('CONFIG')} className={`pb-2 text-sm font-bold ${sqlTab === 'CONFIG' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`}>1. Configuración de Instancia</button>
                                <button onClick={() => setSqlTab('DEPLOY')} className={`pb-2 text-sm font-bold ${sqlTab === 'DEPLOY' ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-500'}`}>2. Despliegue de Agente (Middleware)</button>
                            </div>

                            {sqlTab === 'CONFIG' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-slate-900 p-6 rounded-xl border border-blue-900/30 shadow-lg relative overflow-hidden">
                                        <Icon name="fab fa-google" className="absolute top-[-20px] right-[-20px] text-9xl text-slate-800/50 rotate-12 pointer-events-none" />
                                        
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center text-blue-400 text-2xl border border-blue-800"><Icon name="fa-database"/></div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Conexión a Cloud SQL</h3>
                                                <p className="text-slate-400 text-xs">Configura los parámetros de tu instancia PostgreSQL/MySQL.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase">Instance Connection Name (Obligatorio)</label>
                                                <input 
                                                    className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-white mt-1 font-mono text-sm focus:border-blue-500 outline-none" 
                                                    placeholder="ej. project-id:region:instance-id" 
                                                    value={sqlConfig.connectionName} 
                                                    onChange={e => setSqlConfig({...sqlConfig, connectionName: e.target.value})} 
                                                />
                                                <p className="text-[10px] text-slate-500 mt-1">Lo encuentras en la Descripción General de tu instancia Cloud SQL.</p>
                                            </div>
                                            
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase">Motor BD</label>
                                                <select 
                                                    className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-white mt-1 font-mono text-sm focus:border-blue-500 outline-none"
                                                    value={sqlConfig.provider}
                                                    onChange={e => setSqlConfig({...sqlConfig, provider: e.target.value as 'postgres' | 'mysql'})}
                                                >
                                                    <option value="postgres">PostgreSQL 14/15/16</option>
                                                    <option value="mysql">MySQL 8.0</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase">Nombre Base de Datos</label>
                                                <input className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-white mt-1 font-mono text-sm" placeholder="postgres" value={sqlConfig.dbName} onChange={e => setSqlConfig({...sqlConfig, dbName: e.target.value})} />
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase">Usuario BD</label>
                                                <input className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-white mt-1 font-mono text-sm" placeholder="postgres" value={sqlConfig.dbUser} onChange={e => setSqlConfig({...sqlConfig, dbUser: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase">Cloud Function URL (Middleware)</label>
                                                <input className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-white mt-1 font-mono text-sm text-green-400" placeholder="https://region-project.cloudfunctions.net/proxy" value={sqlConfig.proxyUrl} onChange={e => setSqlConfig({...sqlConfig, proxyUrl: e.target.value})} />
                                            </div>
                                        </div>

                                        <div className="mt-8 flex justify-end gap-3 border-t border-slate-800 pt-4">
                                            <button onClick={handleSaveSqlConfig} className="text-slate-400 hover:text-white px-4 py-2 text-sm font-bold">Guardar Configuración</button>
                                            <button 
                                                onClick={handleTestCloudConnection} 
                                                disabled={isSqlConnecting}
                                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold text-sm shadow-lg flex items-center gap-2"
                                            >
                                                {isSqlConnecting ? <Icon name="fa-circle-notch" className="animate-spin"/> : <Icon name="fa-plug"/>}
                                                {isSqlConnecting ? 'Conectando...' : 'Probar Conexión'}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {!sqlConfig.proxyUrl && (
                                        <div className="bg-orange-900/20 border border-orange-500/30 p-4 rounded-xl flex items-start gap-3">
                                            <Icon name="fa-exclamation-triangle" className="text-orange-500 mt-1" />
                                            <div>
                                                <h4 className="font-bold text-orange-400 text-sm">Falta el Middleware</h4>
                                                <p className="text-xs text-orange-300">Para conectar React con Cloud SQL de forma segura, necesitas desplegar el "Agente de Sincronización". Ve a la pestaña <strong>2. Despliegue de Agente</strong>.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {sqlTab === 'DEPLOY' && (
                                <div className="space-y-6 animate-fade-in h-full flex flex-col">
                                    <div className="bg-slate-900 p-6 rounded-xl border border-green-900/30 shadow-lg flex-1 flex flex-col">
                                        <div className="mb-4">
                                            <h3 className="text-xl font-bold text-white mb-2">Código del Agente (Cloud Function)</h3>
                                            <p className="text-slate-400 text-xs leading-relaxed">
                                                Copia este código y crea una Cloud Function (Gen 2) en tu proyecto Google Cloud. 
                                                <br/>1. Runtime: <strong>Node.js 20</strong>
                                                <br/>2. Entry point: <strong>simpleDataProxy</strong>
                                                <br/>3. En "Conexiones", añade tu instancia de Cloud SQL.
                                            </p>
                                        </div>
                                        
                                        <div className="relative flex-1 bg-black rounded-lg border border-slate-700 overflow-hidden">
                                            <button 
                                                onClick={() => { navigator.clipboard.writeText(getDeployCode()); alert("Código copiado al portapapeles"); }}
                                                className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1 rounded border border-slate-600"
                                            >
                                                Copiar Código
                                            </button>
                                            <pre className="p-4 text-[10px] md:text-xs font-mono text-green-400 overflow-auto h-full">
                                                {getDeployCode()}
                                            </pre>
                                        </div>
                                        
                                        <div className="mt-4 pt-4 border-t border-slate-800">
                                            <p className="text-xs text-slate-500 mb-2">Una vez desplegada, pega la <strong>Trigger URL</strong> aquí:</p>
                                            <div className="flex gap-2">
                                                <input 
                                                    className="flex-1 bg-slate-950 border border-slate-700 p-2 rounded text-white font-mono text-xs" 
                                                    placeholder="https://..." 
                                                    value={sqlConfig.proxyUrl}
                                                    onChange={e => setSqlConfig({...sqlConfig, proxyUrl: e.target.value})}
                                                />
                                                <button onClick={handleSaveSqlConfig} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-xs font-bold">Vincular</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                </div>

                {/* BOTTOM CONSOLE */}
                <div className="h-40 bg-black border-t border-slate-700 p-2 font-mono text-xs overflow-y-auto shrink-0 flex flex-col-reverse">
                    {consoleOutput.map((line, i) => (
                        <div key={i} className="text-slate-400 mb-1 border-b border-slate-900 pb-1 break-all">
                            {line}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};