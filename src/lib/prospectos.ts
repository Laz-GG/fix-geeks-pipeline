export type Canal = "WhatsApp" | "Instagram" | "Facebook";
export type Estado =
  | "Nuevo"
  | "Contactado"
  | "Esperando respuesta"
  | "Información incompleta"
  | "Seguimiento pendiente"
  | "Visita agendada"
  | "Convertido"
  | "Perdido";
export type TipoCaptura = "nuevo" | "captura_manual";

export const CANALES: Canal[] = ["WhatsApp", "Instagram", "Facebook"];
export const ESTADOS: Estado[] = [
  "Nuevo",
  "Contactado",
  "Esperando respuesta",
  "Información incompleta",
  "Seguimiento pendiente",
  "Visita agendada",
  "Convertido",
  "Perdido",
];
// Estados que el usuario puede asignar manualmente desde el selector normal.
// Convertido y Perdido se aplican SOLO con los botones especiales.
export const ESTADOS_ASIGNABLES: Estado[] = [
  "Nuevo",
  "Contactado",
  "Esperando respuesta",
  "Información incompleta",
  "Seguimiento pendiente",
  "Visita agendada",
];
export const PROXIMOS_PASOS = [
  "Pedir modelo",
  "Pedir fotos",
  "Mandar ubicación",
  "Explicar diagnóstico",
  "Agendar visita",
  "Confirmar si vendrá hoy",
  "Dar seguimiento mañana",
  "Marcar como perdido",
];
// Catálogo unificado de acciones (última acción / seguimientos)
export const ACCIONES = [
  "Prospecto registrado",
  "Mensaje recibido",
  "Se pidió modelo",
  "Se pidieron fotos",
  "Se mandó ubicación",
  "Se explicó diagnóstico",
  "Se agendó visita",
  "Se dio seguimiento",
  "No respondió",
  "Cliente respondió",
  "Prospecto convertido",
  "Prospecto marcado como perdido",
  "Otra",
] as const;
export const RESULTADOS_SEGUIMIENTO = [
  "Nuevo",
  "Respondió",
  "No respondió",
  "Esperando fotos",
  "Esperando modelo",
  "Se mandó ubicación",
  "Visita agendada",
  "Convertido",
  "Perdido",
];
export const MOTIVOS_PERDIDA = [
  "No respondió",
  "Precio no aceptado",
  "Ya lo reparó en otro lugar",
  "No quiso diagnóstico",
  "Fuera de alcance",
  "Otro",
];

export interface Prospecto {
  id: string;
  nombre: string;
  telefono: string;
  canal_origen: Canal;
  equipo: string;
  marca_modelo: string;
  falla_reportada: string;
  fotos_recibidas: boolean;
  fecha_contacto: string;
  persona_que_atendio: string;
  estado: Estado;
  ultima_accion: string;
  accion_personalizada: string | null;
  comentario_ultima_accion: string | null;
  proximo_paso: string;
  fecha_proximo_seguimiento: string | null;
  tipo_captura: TipoCaptura;
  fecha_conversion: string | null;
  referencia_orden_gestioo: string | null;
  comentario_conversion: string | null;
  fecha_perdido: string | null;
  motivo_perdido: string | null;
  comentario_perdido: string | null;
  created_at: string;
  updated_at: string;
}

export interface Seguimiento {
  id: string;
  prospecto_id: string;
  fecha: string;
  canal: Canal;
  accion: string;
  comentario: string;
  usuario: string;
  resultado: string;
}

const KEY_P = "fixgeeks.prospectos.v1";
const KEY_S = "fixgeeks.seguimientos.v1";

export const uid = () => Math.random().toString(36).slice(2, 10);
export const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();

export function isActivo(p: Prospecto) {
  return p.estado !== "Convertido" && p.estado !== "Perdido";
}

export function isContactarHoy(p: Prospecto): boolean {
  if (!isActivo(p)) return false;
  const t = today();
  if (p.fecha_proximo_seguimiento && p.fecha_proximo_seguimiento <= t) return true;
  if (p.estado === "Nuevo") {
    const created = new Date(p.created_at).getTime();
    if (Date.now() - created > 4 * 3600 * 1000) return true;
  }
  if (p.estado === "Información incompleta") {
    const upd = new Date(p.updated_at).toISOString().slice(0, 10);
    if (upd < t) return true;
  }
  return false;
}

// Migración para datos viejos sin campos nuevos
function migrate(p: Partial<Prospecto> & { id: string }): Prospecto {
  return {
    tipo_captura: "nuevo",
    accion_personalizada: null,
    comentario_ultima_accion: null,
    ...(p as Prospecto),
  };
}

function demoData(): { prospectos: Prospecto[]; seguimientos: Seguimiento[] } {
  const t = today();
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const ps: Prospecto[] = [
    {
      id: uid(), nombre: "Carlos Méndez", telefono: "+52 555 123 4567",
      canal_origen: "WhatsApp", equipo: "Laptop", marca_modelo: "HP Pavilion 15",
      falla_reportada: "No enciende, posible corto en placa", fotos_recibidas: true,
      fecha_contacto: t, persona_que_atendio: "Ana",
      estado: "Seguimiento pendiente", ultima_accion: "Se mandó ubicación",
      accion_personalizada: null, comentario_ultima_accion: "Cliente confirmó que pasará mañana",
      proximo_paso: "Confirmar si vendrá hoy", fecha_proximo_seguimiento: t,
      tipo_captura: "captura_manual",
      fecha_conversion: null, referencia_orden_gestioo: null, comentario_conversion: null,
      fecha_perdido: null, motivo_perdido: null, comentario_perdido: null,
      created_at: daysAgoIso(48), updated_at: daysAgoIso(20),
    },
    {
      id: uid(), nombre: "María López", telefono: "+52 555 987 6543",
      canal_origen: "Instagram", equipo: "Consola", marca_modelo: "PS5",
      falla_reportada: "No lee discos", fotos_recibidas: false,
      fecha_contacto: t, persona_que_atendio: "Luis",
      estado: "Nuevo", ultima_accion: "Prospecto registrado",
      accion_personalizada: null, comentario_ultima_accion: "Captura inicial del prospecto",
      proximo_paso: "Pedir modelo", fecha_proximo_seguimiento: null,
      tipo_captura: "nuevo",
      fecha_conversion: null, referencia_orden_gestioo: null, comentario_conversion: null,
      fecha_perdido: null, motivo_perdido: null, comentario_perdido: null,
      created_at: daysAgoIso(6), updated_at: daysAgoIso(6),
    },
    {
      id: uid(), nombre: "Jorge Ramírez", telefono: "+52 555 222 3344",
      canal_origen: "Facebook", equipo: "PC", marca_modelo: "Custom Ryzen 5",
      falla_reportada: "Se reinicia sola", fotos_recibidas: false,
      fecha_contacto: ayer, persona_que_atendio: "Ana",
      estado: "Información incompleta", ultima_accion: "Se pidieron fotos",
      accion_personalizada: null, comentario_ultima_accion: "Pedimos modelo y fotos por WhatsApp",
      proximo_paso: "Pedir fotos", fecha_proximo_seguimiento: t,
      tipo_captura: "captura_manual",
      fecha_conversion: null, referencia_orden_gestioo: null, comentario_conversion: null,
      fecha_perdido: null, motivo_perdido: null, comentario_perdido: null,
      created_at: daysAgoIso(36), updated_at: daysAgoIso(30),
    },
    {
      id: uid(), nombre: "Sofía Torres", telefono: "+52 555 444 5566",
      canal_origen: "WhatsApp", equipo: "Laptop", marca_modelo: "MacBook Pro 2019",
      falla_reportada: "Cambio de pantalla", fotos_recibidas: true,
      fecha_contacto: ayer, persona_que_atendio: "Luis",
      estado: "Convertido", ultima_accion: "Prospecto convertido",
      accion_personalizada: null, comentario_ultima_accion: "Dejó equipo en taller",
      proximo_paso: "", fecha_proximo_seguimiento: null,
      tipo_captura: "captura_manual",
      fecha_conversion: t, referencia_orden_gestioo: "GST-00231", comentario_conversion: "Dejó equipo en taller",
      fecha_perdido: null, motivo_perdido: null, comentario_perdido: null,
      created_at: daysAgoIso(72), updated_at: daysAgoIso(2),
    },
    {
      id: uid(), nombre: "Pedro Gómez", telefono: "+52 555 777 8899",
      canal_origen: "Instagram", equipo: "Tarjeta madre", marca_modelo: "ASUS ROG B550",
      falla_reportada: "No da video", fotos_recibidas: false,
      fecha_contacto: ayer, persona_que_atendio: "Ana",
      estado: "Perdido", ultima_accion: "Prospecto marcado como perdido",
      accion_personalizada: null, comentario_ultima_accion: "Le pareció caro el diagnóstico",
      proximo_paso: "", fecha_proximo_seguimiento: null,
      tipo_captura: "captura_manual",
      fecha_conversion: null, referencia_orden_gestioo: null, comentario_conversion: null,
      fecha_perdido: t, motivo_perdido: "Precio no aceptado", comentario_perdido: "Le pareció caro el diagnóstico",
      created_at: daysAgoIso(96), updated_at: daysAgoIso(5),
    },
  ];
  const ss: Seguimiento[] = ps.map(p => ({
    id: uid(), prospecto_id: p.id, fecha: p.created_at,
    canal: p.canal_origen, accion: p.ultima_accion,
    comentario: p.comentario_ultima_accion || "Captura inicial del prospecto",
    usuario: p.persona_que_atendio,
    resultado: p.estado === "Convertido" ? "Convertido" : p.estado === "Perdido" ? "Perdido" : p.estado === "Nuevo" ? "Nuevo" : "Respondió",
  }));
  return { prospectos: ps, seguimientos: ss };
}

export function loadProspectos(): Prospecto[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY_P);
  if (!raw) {
    const d = demoData();
    localStorage.setItem(KEY_P, JSON.stringify(d.prospectos));
    localStorage.setItem(KEY_S, JSON.stringify(d.seguimientos));
    return d.prospectos;
  }
  try {
    const arr = JSON.parse(raw) as Prospecto[];
    return arr.map(migrate);
  } catch { return []; }
}
export function loadSeguimientos(): Seguimiento[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY_S);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}
export function saveProspectos(p: Prospecto[]) { localStorage.setItem(KEY_P, JSON.stringify(p)); }
export function saveSeguimientos(s: Seguimiento[]) { localStorage.setItem(KEY_S, JSON.stringify(s)); }
export function resetDemo() {
  localStorage.removeItem(KEY_P);
  localStorage.removeItem(KEY_S);
  const d = demoData();
  localStorage.setItem(KEY_P, JSON.stringify(d.prospectos));
  localStorage.setItem(KEY_S, JSON.stringify(d.seguimientos));
  return d;
}

export function exportCsv(prospectos: Prospecto[]) {
  const cols: (keyof Prospecto)[] = [
    "nombre","telefono","canal_origen","equipo","marca_modelo","falla_reportada",
    "fotos_recibidas","fecha_contacto","persona_que_atendio","estado","ultima_accion",
    "comentario_ultima_accion","proximo_paso","fecha_proximo_seguimiento","tipo_captura",
    "fecha_conversion","referencia_orden_gestioo","fecha_perdido","motivo_perdido",
    "created_at","updated_at",
  ];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [cols.join(","), ...prospectos.map(p => cols.map(c => esc(p[c])).join(","))];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `prospectos-fixgeeks-${today()}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export function buildMensaje(p: Prospecto) {
  return `Hola ${p.nombre}, te escribimos de Fix Geeks para dar seguimiento a tu equipo ${p.equipo}. Queríamos confirmar el siguiente paso: ${p.proximo_paso || "continuar con tu proceso"}. Quedamos atentos.`;
}
