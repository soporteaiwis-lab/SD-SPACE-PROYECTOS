import { User, UserRole, Project, Gem, Tool } from './types';

// --- CONFIGURACIÓN DE ENTORNO (.ENV & LOCAL STORAGE) ---
const getEnvVar = (key: string): string => {
  // 1. Process Env
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  if (typeof process !== 'undefined' && process.env && process.env[`REACT_APP_${key}`]) {
    return process.env[`REACT_APP_${key}`] as string;
  }
  
  // 2. Vite / Meta Env
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      if (import.meta.env[key]) return import.meta.env[key];
      // @ts-ignore
      if (import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`];
    }
  } catch (e) {
    // Ignore errors
  }

  // 3. LOCAL STORAGE (Prioritize SIMPLEDATA keys, fallback to SIMPLE keys for migration)
  if (typeof window !== 'undefined') {
      const SIMPLEDATAKey = localStorage.getItem(`SIMPLEDATA_env_${key}`);
      if (SIMPLEDATAKey) return SIMPLEDATAKey;

      // Fallback for previous SimpleData users
      const simpleKey = localStorage.getItem(`simple_env_${key}`);
      if (simpleKey) return simpleKey;
  }
  
  return '';
};

// --- CLAVES PÚBLICAS (HARDCODED) ---
// REEMPLAZA ESTOS VALORES CON TUS CLAVES REALES PARA QUE FUNCIONE AUTOMÁTICAMENTE
const HARDCODED_KEYS = {
    GEMINI: "PEGAR_AQUI_TU_API_KEY_DE_GEMINI",
    GITHUB: "PEGAR_AQUI_TU_TOKEN_GITHUB_PAT",
    DRIVE_CLIENT_ID: "89422266816-meh16hnsdp10313n2uo94s5erqc2kri5.apps.googleusercontent.com" // Ya puse el ID de tu imagen
};

export const APP_CONFIG = {
  // Orden de prioridad: 1. Variable de Entorno/LocalStorage, 2. Hardcoded Key
  GEMINI_API_KEY: getEnvVar('API_KEY') || HARDCODED_KEYS.GEMINI, 
  GITHUB_TOKEN: getEnvVar('GITHUB_TOKEN') || HARDCODED_KEYS.GITHUB,
  GOOGLE_CLIENT_ID: getEnvVar('GOOGLE_CLIENT_ID') || HARDCODED_KEYS.DRIVE_CLIENT_ID
};

// --- NUEVO EQUIPO SIMPLEDATA (OFICIAL) ---
export const INITIAL_USERS: User[] = [
  {
    id: "u_gonzalo",
    name: "Gonzalo Arias",
    role: UserRole.CEO,
    email: "gonzalo.arias@simpledata.cl",
    password: "1234",
    avatar: "https://ui-avatars.com/api/?name=Gonzalo+Arias&background=0D8ABC&color=fff",
    skills: [
      { name: "Dirección General", level: 100 },
      { name: "Estrategia de Negocios", level: 98 },
      { name: "Gestión de Proyectos", level: 95 }
    ],
    projects: ["PROYECTO_001", "PROYECTO_002", "PROYECTO_003", "PROYECTO_004"]
  },
  {
    id: "u_soporte",
    name: "Soporte AIWIS",
    role: UserRole.ADMIN,
    email: "soporte.aiwis@gmail.com",
    password: "",
    avatar: "https://ui-avatars.com/api/?name=AIWIS+Root&background=000000&color=fff",
    skills: [
      { name: "System Architecture", level: 100 },
      { name: "Database Management", level: 100 },
      { name: "Security", level: 100 }
    ],
    projects: ["PROYECTO_001", "PROYECTO_004"]
  },
  {
    id: "u_gabriel",
    name: "Gabriel Martinez",
    role: UserRole.ANALYST,
    email: "gabriel.martinez@simpledata.cl",
    password: "1234",
    avatar: "https://ui-avatars.com/api/?name=Gabriel+Martinez&background=random",
    skills: [
      { name: "Análisis de Datos", level: 90 },
      { name: "Gestión Documental", level: 85 }
    ],
    projects: ["PROYECTO_001"]
  },
  {
    id: "u_fernando",
    name: "Fernando Cid",
    role: UserRole.DEVELOPER,
    email: "fernando.cid@simpledata.cl",
    password: "1234",
    avatar: "https://ui-avatars.com/api/?name=Fernando+Cid&background=random",
    skills: [
      { name: "Desarrollo Frontend", level: 85 },
      { name: "UX/UI", level: 80 }
    ],
    projects: ["PROYECTO_002"]
  },
  {
    id: "u_francisco",
    name: "Francisco Valenzuela",
    role: UserRole.ANALYST,
    email: "francisco.valenzuela@simpledata.cl",
    password: "1234",
    avatar: "https://ui-avatars.com/api/?name=Francisco+Valenzuela&background=random",
    skills: [
      { name: "QA Testing", level: 90 },
      { name: "Documentación", level: 95 }
    ],
    projects: ["PROYECTO_001", "PROYECTO_003"]
  },
  {
    id: "u_anibal",
    name: "Anibal Alcazar",
    role: UserRole.DEVELOPER,
    email: "anibal.alcazar@simpledata.cl",
    password: "1234",
    avatar: "https://ui-avatars.com/api/?name=Anibal+Alcazar&background=random",
    skills: [
      { name: "Backend Java", level: 88 },
      { name: "SQL", level: 85 }
    ],
    projects: ["PROYECTO_003"]
  },
  {
    id: "u_alejandro",
    name: "Alejandro Venegas",
    role: UserRole.DEVELOPER,
    email: "alejandro.venegas@simpledata.cl",
    password: "1234",
    avatar: "https://ui-avatars.com/api/?name=Alejandro+Venegas&background=random",
    skills: [
      { name: "Full Stack", level: 90 },
      { name: "Python", level: 85 }
    ],
    projects: ["PROYECTO_004"]
  },
  {
    id: "u_juan",
    name: "Juan Escalona",
    role: UserRole.PROJECT_MANAGER,
    email: "juan.escalona@simpledata.cl",
    password: "1234",
    avatar: "https://ui-avatars.com/api/?name=Juan+Escalona&background=random",
    skills: [
      { name: "Gestión de Equipos", level: 92 },
      { name: "Scrum", level: 90 }
    ],
    projects: ["PROYECTO_001", "PROYECTO_002"]
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'PROYECTO_001',
    name: 'Sistema de Facturación Interna',
    client: 'Interno SIMPLEDATA',
    encargadoCliente: 'Gerencia Admin',
    leadId: 'u_juan', // Juan Escalona (PM)
    teamIds: ['u_gabriel', 'u_francisco', 'u_soporte', 'u_gonzalo'],
    status: 'En Curso',
    isOngoing: true,
    report: true,
    startDate: '2025-01-15',
    deadline: '2025-06-30',
    progress: 45,
    year: 2025,
    description: 'Desarrollar un sistema interno para la facturación y cobranza de servicios. Debe integrarse con el sistema de contabilidad.',
    technologies: ['AWS', 'Python', 'Spark', 'Terraform'],
    logs: [
      { id: 'l1', date: '2025-02-10T10:00:00', text: 'Inicio de la fase de diseño de arquitectura.', author: 'Soporte AIWIS' },
      { id: 'l2', date: '2025-02-12T14:30:00', text: 'Reunión con contabilidad para definir esquema de base de datos.', author: 'Gabriel Martinez' }
    ],
    repositories: [
        { id: 'r1', type: 'github', alias: 'Repositorio Oficial', url: 'https://github.com/soporteaiwis-lab/SIMPLEDATA-APP-CORPORATE-PROYECTOS-OFICIAL-' }, 
        { id: 'r2', type: 'drive', alias: 'Documentación Oficial', url: 'https://drive.google.com/drive/folders/1S3Zavf6xdp9WaM8-gowBJImdkmSD_Niw' }
    ]
  },
  {
    id: 'PROYECTO_002',
    name: 'Desarrollo de App Móvil Clientes',
    client: 'Cliente Retail XYZ',
    encargadoCliente: 'Gerente de Innovación',
    leadId: 'u_juan', // Juan Escalona (PM)
    teamIds: ['u_fernando', 'u_gonzalo'],
    status: 'En Curso',
    isOngoing: true,
    report: true,
    startDate: '2025-03-01',
    deadline: '2025-09-01',
    progress: 10,
    year: 2025,
    description: 'App móvil para iOS y Android que permita a los clientes finales visualizar su estado de cuenta, revisar catálogos y realizar compras.',
    technologies: ['React Native', 'Node.js', 'Firebase'],
    logs: [],
    repositories: [
         { id: 'r1', type: 'github', alias: 'Repositorio Oficial', url: 'https://github.com/soporteaiwis-lab/SIMPLEDATA-APP-CORPORATE-PROYECTOS-OFICIAL-' }
    ]
  },
  {
    id: 'PROYECTO_003',
    name: 'Migración de Servidores Cloud',
    client: 'Empresa Logística ABC',
    encargadoCliente: 'Jefe de IT',
    leadId: 'u_anibal', // Anibal (Backend)
    teamIds: ['u_francisco', 'u_gonzalo'],
    status: 'En Curso',
    isOngoing: true,
    report: true,
    startDate: '2024-10-01',
    deadline: '2024-12-20',
    progress: 80,
    year: 2024,
    description: 'Migrar la infraestructura on-premise del cliente a un entorno cloud en AWS, optimizando costos y mejorando la escalabilidad.',
    technologies: ['AWS', 'Docker', 'Linux'],
    logs: [
       { id: 'l1', date: '2024-12-01T18:00:00', text: 'Instancias EC2 configuradas.', author: 'Anibal Alcazar' }
    ],
    repositories: []
  },
  {
    id: 'PROYECTO_004',
    name: 'Infraestructura DevSecOps',
    client: 'Banco Financiero',
    encargadoCliente: 'CISO',
    leadId: 'u_alejandro', // Alejandro (FullStack/Dev)
    teamIds: ['u_soporte', 'u_gonzalo'],
    status: 'En Curso',
    isOngoing: true,
    report: true,
    startDate: '2025-01-05',
    deadline: '2025-08-20',
    progress: 25,
    year: 2025,
    description: 'Implementación de pipelines de seguridad y auditoría automatizada.',
    technologies: ['Jenkins', 'SonarQube', 'Kubernetes'],
    logs: [
       { id: 'l1', date: '2025-01-20T10:00:00', text: 'Pipelines base creados.', author: 'Alejandro Venegas' }
    ],
    repositories: []
  }
];

export const INITIAL_GEMS: Gem[] = [
    { id: 'g1', url: 'https://gemini.google.com/gem/6257c452aac9', name: 'COTIZACIONES', description: 'Asistente experto en la generación y análisis de cotizaciones.', icon: 'fa-calculator' },
    { id: 'g2', url: 'https://gemini.google.com/gem/fa10051c004b', name: 'PIPELINES AZURE', description: 'Especialista en crear pipelines de Azure y archivos JSON.', icon: 'fa-cloud' },
    { id: 'g3', url: 'https://gemini.google.com/gem/4ca9a51fdffc', name: 'MAPEO DATA BRICKS', description: 'Analista de código para mapear y entender notebooks de Data Bricks.', icon: 'fa-project-diagram' },
    { id: 'g4', url: 'https://gemini.google.com/gem/1dbe6e06847f', name: 'FACTORIA COBOL', description: 'Herramienta para la modernización y análisis de código COBOL.', icon: 'fa-code' },
    { id: 'g5', url: 'https://gemini.google.com/gem/910761c1caf2', name: 'ANALIZADOR REQUERMIENTOS', description: 'IA para analizar y desglosar requerimientos de software complejos.', icon: 'fa-brain' },
    { id: 'g6', url: 'https://gemini.google.com/gem/5745999ccff7', name: 'QUIZ CAPACITACIONES', description: 'Generador de cuestionarios y quizzes para material de capacitación.', icon: 'fa-graduation-cap' }
];

export const INITIAL_TOOLS: Tool[] = [
  { id: 't1', name: 'VS Code Web', url: 'https://vscode.dev', icon: 'fa-code', color: 'text-blue-500' },
  { id: 't2', name: 'Azure Portal', url: 'https://portal.azure.com', icon: 'fa-cloud', color: 'text-blue-400' },
  { id: 't3', name: 'AWS Console', url: 'https://aws.amazon.com/console/', icon: 'fa-server', color: 'text-orange-500' },
  { id: 't4', name: 'ChatGPT', url: 'https://chat.openai.com', icon: 'fa-bolt', color: 'text-emerald-500' },
  { id: 't5', name: 'Gemini', url: 'https://gemini.google.com', icon: 'fa-gem', color: 'text-purple-500' },
  { id: 't6', name: 'Firebase Console', url: 'https://console.firebase.google.com', icon: 'fa-fire', color: 'text-yellow-500' },
  { id: 't7', name: 'MongoDB Atlas', url: 'https://cloud.mongodb.com', icon: 'fa-leaf', color: 'text-green-500' },
  { id: 't8', name: 'GitHub', url: 'https://github.com', icon: 'fa-github', color: 'text-slate-800' },
];