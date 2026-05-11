import { Canal, Estado } from "@/lib/prospectos";
import { cn } from "@/lib/utils";

const canalStyles: Record<Canal, string> = {
  WhatsApp: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Instagram: "bg-pink-100 text-pink-700 border-pink-200",
  Facebook: "bg-blue-100 text-blue-700 border-blue-200",
};
const estadoStyles: Record<Estado, string> = {
  "Nuevo": "bg-sky-100 text-sky-700 border-sky-200",
  "Contactado": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Esperando respuesta": "bg-amber-100 text-amber-700 border-amber-200",
  "Información incompleta": "bg-orange-100 text-orange-700 border-orange-200",
  "Seguimiento pendiente": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Visita agendada": "bg-violet-100 text-violet-700 border-violet-200",
  "Convertido": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Perdido": "bg-rose-100 text-rose-700 border-rose-200",
};

export function ChannelBadge({ canal }: { canal: Canal }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", canalStyles[canal])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {canal}
    </span>
  );
}

export function StatusBadge({ estado }: { estado: Estado }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", estadoStyles[estado])}>
      {estado}
    </span>
  );
}
