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
  const [consoleOutput, setConsoleOutput] = useState<string[]>(['> SIMPLEDATA Maestro Engine v2.1 initialized...', '> Waiting for commands.']);
  
  // DDL State
  const [newColumnName, setNewColumnName] = useState('');
  
  // Cloud SQL State
  const [sqlConfig, setSqlConfig] = useState<CloudSQLConfig>(db.getCloudSqlConfig());
  const [isSqlConnecting, setIsSqlConnecting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [sqlTab, setSqlTab] = useState<'CONFIG' | 'DEPLOY'>('CONFIG');
  const [deployFileTab, setDeployFileTab] = useState<'INDEX' | 'PACKAGE'>('INDEX');

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
      await db.alterTable(activeTable, 'ADD_COLUMN', newColumnName);
      addToConsole(`DDL: ALTER TABLE ${activeTable} ADD COLUMN '${newColumnName}'`);
      setNewColumnName('');
      loadTable(activeTable);
      setStatusMsg('✅ Columna agregada (Local & Cloud).');
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
      // 1. Validar que haya URL escrita
      if (!sqlConfig.proxyUrl) {
          alert("Debes configurar la URL de la Cloud Function (Middleware) primero.");
          setSqlTab('DEPLOY');
          return;
      }

      setIsSqlConnecting(true);

      // 2. AUTO-GUARDADO: Sincronizar estado de UI con el Servicio DB antes de probar
      // Limpiamos espacios y slash final por si acaso
      const cleanUrl = sqlConfig.proxyUrl.trim().replace(/\/$/, "");
      const configToSync = { ...sqlConfig, proxyUrl: cleanUrl };
      
      setSqlConfig(configToSync); // Actualizar UI
      db.saveCloudSqlConfig(configToSync); // Actualizar Servicio Interno (CRÍTICO)

      addToConsole(`CLOUD SQL: Connecting to ${configToSync.connectionName} via Middleware...`);
      addToConsole(`DEBUG: Target URL -> ${cleanUrl}`);
      
      try {
          await db.executeSql('SELECT 1');
          addToConsole(`CLOUD SQL: Handshake Successful.`);
          addToConsole(`CLOUD SQL: Connected to ${configToSync.connectionName}`);
          setStatusMsg('✅ Conexión Exitosa con Cloud SQL.');
          setSqlConfig(prev => ({ ...prev, isActive: true }));
          db.saveCloudSqlConfig({ ...configToSync, isActive: true });
      } catch (e: any) {
          addToConsole(`CLOUD SQL ERROR: ${e.message}`);
          alert("Error de Conexión: " + e.message);
      } finally {
          setIsSqlConnecting(false);
      }
  };

  const handleInitializeCloud = async () => {
      setIsMigrating(true);
      addToConsole("CLOUD: Initializing Tables (JSONB Schema)...");
      try {
          await db.initializeCloudSchema();
          addToConsole("CLOUD: Tables created/verified successfully.");
          setStatusMsg("✅ Tablas Inicializadas");
      } catch (e: any) {
          addToConsole(`CLOUD ERROR: ${e.message}`);
          alert("Error inicializando tablas: " + e.message);
      } finally {
          setIsMigrating(false);
      }
  };

  const handleMigration = async () => {
      if(!confirm("Esto sobrescribirá los datos en Cloud SQL con los datos Locales actuales. ¿Continuar?")) return;
      
      setIsMigrating(true);
      addToConsole("CLOUD: Starting Data Migration (Local -> Cloud)...");
      try {
          await db.migrateLocalToCloud();
          addToConsole("CLOUD: Migration Complete!");
          setStatusMsg("✅ Datos Migrados Exitosamente");
      } catch (e: any) {
          addToConsole(`CLOUD ERROR: ${e.message}`);
          alert("Error durante la migración: " + e.message);
      } finally {
          setIsMigrating(false);
      }
  };

  const getPackageJson = () => {
      const dbType = sqlConfig.provider === 'postgres' ? 'pg' : 'mysql2';
      return JSON.stringify({
        "name": "simpledata-proxy",
        "version": "1.0.0",
        "main": "index.js",
        "dependencies": {
          "@google-cloud/functions-framework": "^3.0.0",
          [dbType]: "^8.11.0"
        }
      }, null, 2);
  };

  const getIndexJs = () => {
      const dbType = sqlConfig.provider === 'postgres' ? 'pg' : 'mysql2';
      return `
const { Pool } = require('${dbType}');

// Configuración de Conexión
const pool = new Pool({
  user: '${sqlConfig.dbUser || 'postgres'}',
  password: 'TU_PASSWORD_DB', // <--- REEMPLAZA ESTO EN GOOGLE CLOUD
  database: '${sqlConfig.dbName || 'postgres'}',
  // Conexión vía Unix Socket (Recomendado para GCF)
  host: '/cloudsql/${sqlConfig.connectionName || 'PROJECT:REGION:INSTANCE'}' 
});

exports.simpleDataProxy = async (req, res) => {
  // Headers CORS para permitir acceso desde tu Web App
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST');
  
  // Manejo de pre-flight request (OPTIONS)
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  try {
    const { query, params } = req.body; 
    if (!query) throw new Error("Query missing");

    // Ejecutar Query
    const result = await pool.query(query, params || []);
    
    // Normalizar respuesta (pg devuelve .rows, mysql devuelve [rows])
    const rows = result.rows || result[0] || [];
    res.status(200).json({ data: rows });
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
      addToConsole(`ETL: Import simulated. To persist, use standard add methods.`);
      setCsvPreview(null);
  };

  const handleHardReset = async () => {
      const confirmText = prompt("PROTOCOL DESTRUCTIVO: Escriba 'DELETE' para borrar DATOS LOCALES.");
      if (confirmText === 'DELETE') {
          await db.resetToDefaults();
          addToConsole('SYSTEM: LOCAL HARD RESET EXECUTED.');
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
                    <p className="text-[10px] text-orange-500 font-mono flex items-center gap-2">
                        {sqlConfig.isActive ? (
                             <><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> ONLINE: CLOUD SQL</>
                        ) : (
                             <><span className="w-2 h-2 bg-slate-500 rounded-full"></span> OFFLINE: LOCAL STORAGE</>
                        )}
                    </p>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button onClick={handleHardReset} className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900 text-red-200 text-xs font-bold rounded flex items-center gap-2 border border-red-800 transition-colors">
                    <Icon name="fa-bomb"/> HARD RESET (LOCAL)
                </button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* SIDEBAR */}
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
                        <Icon name="fa-cloud" className="text-blue-500" /> CLOUD SQL SETUP
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
                        <Icon name="fa-wrench" className="mr-1"/> DDL
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
                                <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Icon name="fa-plus-circle"/> Agregar Nueva Columna (JSON Field)</h3>
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
                            </div>
                        </div>
                    )}

                    {viewMode === 'CLOUDSQL' && (
                        <div className="max-w-4xl mx-auto h-full flex flex-col">
                            {/* SQL SUB-TABS */}
                            <div className="flex gap-4 mb-6 border-b border-slate-700 pb-2">
                                <button onClick={() => setSqlTab('CONFIG')} className={`pb-2 text-sm font-bold ${sqlTab === 'CONFIG' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`}>1. Configuración de Instancia</button>
                                <button onClick={() => setSqlTab('DEPLOY')} className={`pb-2 text-sm font-bold ${sqlTab === 'DEPLOY' ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-500'}`}>2. Despliegue de Agente</button>
                            </div>

                            {sqlTab === 'CONFIG' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-slate-900 p-6 rounded-xl border border-blue-900/30 shadow-lg relative overflow-hidden">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase">Instance Connection Name</label>
                                                <input 
                                                    className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-white mt-1 font-mono text-sm focus:border-blue-500 outline-none" 
                                                    placeholder="ej. project-id:region:instance-id" 
                                                    value={sqlConfig.connectionName} 
                                                    onChange={e => setSqlConfig({...sqlConfig, connectionName: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase">DB User</label>
                                                <input className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-white mt-1 font-mono text-sm" value={sqlConfig.dbUser} onChange={e => setSqlConfig({...sqlConfig, dbUser: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase">DB Name</label>
                                                <input className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-white mt-1 font-mono text-sm" value={sqlConfig.dbName} onChange={e => setSqlConfig({...sqlConfig, dbName: e.target.value})} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase">Cloud Function Proxy URL</label>
                                                <input className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-white mt-1 font-mono text-sm text-green-400" placeholder="https://..." value={sqlConfig.proxyUrl} onChange={e => setSqlConfig({...sqlConfig, proxyUrl: e.target.value})} />
                                            </div>
                                        </div>

                                        <div className="mt-8 flex justify-between gap-3 border-t border-slate-800 pt-4">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-bold text-white">Estado:</label>
                                                <button 
                                                    onClick={() => {
                                                        const newState = !sqlConfig.isActive;
                                                        setSqlConfig({...sqlConfig, isActive: newState});
                                                        db.saveCloudSqlConfig({...sqlConfig, isActive: newState});
                                                    }} 
                                                    className={`px-3 py-1 rounded text-xs font-bold border ${sqlConfig.isActive ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-400'}`}
                                                >
                                                    {sqlConfig.isActive ? 'ACTIVO (USA NUBE)' : 'INACTIVO (SOLO LOCAL)'}
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={handleSaveSqlConfig} className="text-slate-400 hover:text-white px-4 py-2 text-sm font-bold">Guardar</button>
                                                <button 
                                                    onClick={handleTestCloudConnection} 
                                                    disabled={isSqlConnecting}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold text-sm shadow-lg flex items-center gap-2"
                                                >
                                                    {isSqlConnecting ? <Icon name="fa-circle-notch" className="animate-spin"/> : <Icon name="fa-plug"/>}
                                                    Probar Conexión
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* MIGRATION & INIT PANEL */}
                                    {sqlConfig.isActive && (
                                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-slide-up">
                                            <h3 className="text-lg font-bold text-white mb-4">Acciones Cloud SQL (PostgreSQL 17)</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <button 
                                                    onClick={handleInitializeCloud}
                                                    disabled={isMigrating}
                                                    className="p-4 bg-slate-900 border border-slate-600 hover:border-blue-500 rounded-xl flex items-center gap-4 group text-left"
                                                >
                                                    <div className="w-10 h-10 bg-blue-900/50 text-blue-400 rounded-full flex items-center justify-center font-bold">1</div>
                                                    <div>
                                                        <h4 className="font-bold text-blue-100 group-hover:text-blue-400 transition-colors">Inicializar Tablas</h4>
                                                        <p className="text-xs text-slate-500">Crea las tablas JSONB necesarias en la BD.</p>
                                                    </div>
                                                </button>

                                                <button 
                                                    onClick={handleMigration}
                                                    disabled={isMigrating}
                                                    className="p-4 bg-slate-900 border border-slate-600 hover:border-green-500 rounded-xl flex items-center gap-4 group text-left"
                                                >
                                                    <div className="w-10 h-10 bg-green-900/50 text-green-400 rounded-full flex items-center justify-center font-bold">2</div>
                                                    <div>
                                                        <h4 className="font-bold text-green-100 group-hover:text-green-400 transition-colors">Migrar Datos Locales</h4>
                                                        <p className="text-xs text-slate-500">Sube todos los datos actuales a Cloud SQL.</p>
                                                    </div>
                                                </button>
                                            </div>
                                            {isMigrating && (
                                                <div className="mt-4 text-center text-xs text-slate-400">
                                                    <Icon name="fa-circle-notch" className="animate-spin mr-2"/> Procesando solicitud...
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {sqlTab === 'DEPLOY' && (
                                <div className="space-y-6 animate-fade-in h-full flex flex-col">
                                    <div className="bg-slate-900 p-6 rounded-xl border border-green-900/30 shadow-lg flex-1 flex flex-col">
                                        <div className="mb-4">
                                            <h3 className="text-xl font-bold text-white mb-2">Código del Agente (Cloud Function) v2.1</h3>
                                            
                                            {/* IMPORTANT WARNING BOX - POINT OF ENTRY */}
                                            <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg mb-4 text-xs text-red-200">
                                                <h4 className="font-bold flex items-center gap-2 mb-1"><Icon name="fa-exclamation-triangle" /> IMPORTANTE: CONFIGURACIÓN INICIAL</h4>
                                                <ul className="list-disc pl-4 space-y-1 mt-2">
                                                    <li>Punto de entrada: <strong>simpleDataProxy</strong> (No usar package.json)</li>
                                                </ul>
                                            </div>

                                            {/* IMPORTANT WARNING BOX - SQL CONNECTION (FIX FOR ENOENT) */}
                                            <div className="bg-blue-900/20 border border-blue-500/50 p-4 rounded-lg mb-4 text-xs text-blue-200">
                                                <h4 className="font-bold flex items-center gap-2 mb-1"><Icon name="fa-plug" /> SOLUCIÓN ERROR DE CONEXIÓN (ENOENT)</h4>
                                                <p className="mb-2">Si ves el error "ENOENT /cloudsql/...", significa que la Cloud Function no tiene permiso para ver la BD.</p>
                                                <p className="font-bold text-white mb-1">Debes hacer esto en Google Cloud Console:</p>
                                                <ol className="list-decimal pl-4 space-y-1">
                                                    <li>Edita tu Cloud Function (Revisión).</li>
                                                    <li>Ve a <strong>"Configuración"</strong> &rarr; <strong>"Integraciones"</strong> o <strong>"Conexiones"</strong>.</li>
                                                    <li>Busca la sección <strong>"Cloud SQL"</strong>.</li>
                                                    <li>Haz clic en <strong>"Añadir Conexión"</strong>.</li>
                                                    <li>Selecciona tu instancia: <span className="font-mono bg-black/30 px-1 rounded">{sqlConfig.connectionName || 'tu-instancia'}</span></li>
                                                    <li>Despliega nuevamente.</li>
                                                </ol>
                                            </div>

                                            <div className="flex gap-2 border-b border-slate-700">
                                                <button 
                                                    onClick={() => setDeployFileTab('INDEX')}
                                                    className={`px-4 py-2 text-xs font-bold border-t border-l border-r rounded-t-lg transition-colors ${deployFileTab === 'INDEX' ? 'bg-black border-slate-600 text-green-400' : 'bg-slate-800 border-transparent text-slate-500'}`}
                                                >
                                                    1. index.js (Lógica)
                                                </button>
                                                <button 
                                                    onClick={() => setDeployFileTab('PACKAGE')}
                                                    className={`px-4 py-2 text-xs font-bold border-t border-l border-r rounded-t-lg transition-colors ${deployFileTab === 'PACKAGE' ? 'bg-black border-slate-600 text-yellow-400' : 'bg-slate-800 border-transparent text-slate-500'}`}
                                                >
                                                    2. package.json (Dependencias)
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="relative flex-1 bg-black rounded-b-lg border border-slate-700 overflow-hidden">
                                            <button 
                                                onClick={() => { 
                                                    const code = deployFileTab === 'INDEX' ? getIndexJs() : getPackageJson();
                                                    navigator.clipboard.writeText(code); 
                                                    alert(`${deployFileTab === 'INDEX' ? 'index.js' : 'package.json'} copiado.`); 
                                                }}
                                                className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1 rounded border border-slate-600 z-10"
                                            >
                                                Copiar
                                            </button>
                                            <pre className={`p-4 text-[10px] md:text-xs font-mono overflow-auto h-full ${deployFileTab === 'INDEX' ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {deployFileTab === 'INDEX' ? getIndexJs() : getPackageJson()}
                                            </pre>
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