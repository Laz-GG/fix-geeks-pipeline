import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Prospecto, Seguimiento, CANALES, ESTADOS, isContactarHoy, isActivo,
  loadProspectos, loadSeguimientos, saveProspectos, saveSeguimientos,
  resetDemo, exportCsv, buildMensaje, nowIso,
} from "@/lib/prospectos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChannelBadge, StatusBadge } from "@/components/fixgeeks/Badges";
import { ProspectoDialog } from "@/components/fixgeeks/ProspectoDialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Plus, Search, Download, RefreshCw, Copy, Pencil, Wrench,
  Calendar, Phone, User, MessageSquare, Instagram, Facebook,
  TrendingUp, AlertCircle, CheckCircle2, XCircle, Clock,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fix Geeks · Prospectos MVP" },
      { name: "description", content: "Mini CRM para gestionar prospectos de Fix Geeks." },
    ],
  }),
  component: Index,
});

function Index() {
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Prospecto | null>(null);
  const [initialTab, setInitialTab] = useState<string>("datos");
  const [view, setView] = useState("hoy");

  // list filters
  const [filterCanal, setFilterCanal] = useState<string>("Todos");
  const [filterEstado, setFilterEstado] = useState<string>("Todos");
  const [filterRapida, setFilterRapida] = useState<string>("activos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setProspectos(loadProspectos());
    setSeguimientos(loadSeguimientos());
  }, []);

  useEffect(() => { if (prospectos.length || localStorage.getItem("fixgeeks.prospectos.v1")) saveProspectos(prospectos); }, [prospectos]);
  useEffect(() => { saveSeguimientos(seguimientos); }, [seguimientos]);

  const upsert = (p: Prospecto) => {
    setProspectos(prev => {
      const exists = prev.some(x => x.id === p.id);
      return exists ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev];
    });
  };
  const addSeguimiento = (s: Seguimiento, updates?: Partial<Prospecto>) => {
    setSeguimientos(prev => [s, ...prev]);
    if (updates) setProspectos(prev => prev.map(p => p.id === s.prospecto_id ? { ...p, ...updates } : p));
  };

  const openNew = () => { setEditing(null); setInitialTab("datos"); setOpen(true); };
  const openEdit = (p: Prospecto, tab: string = "datos") => { setEditing(p); setInitialTab(tab); setOpen(true); };

  const copiarMensaje = async (p: Prospecto) => {
    await navigator.clipboard.writeText(buildMensaje(p));
    toast.success("Mensaje copiado");
  };

  const handleReset = () => {
    if (!confirm("¿Reiniciar todos los datos demo? Se borrará lo actual.")) return;
    const d = resetDemo();
    setProspectos(d.prospectos);
    setSeguimientos(d.seguimientos);
    toast.success("Datos demo reiniciados");
  };

  // metrics
  const metrics = useMemo(() => {
    const activos = prospectos.filter(isActivo);
    const m = {
      activos: activos.length,
      nuevos: prospectos.filter(p => p.estado === "Nuevo").length,
      seguimiento: prospectos.filter(p => p.estado === "Seguimiento pendiente" || p.estado === "Esperando respuesta").length,
      incompleta: prospectos.filter(p => p.estado === "Información incompleta").length,
      visita: prospectos.filter(p => p.estado === "Visita agendada").length,
      convertidos: prospectos.filter(p => p.estado === "Convertido").length,
      perdidos: prospectos.filter(p => p.estado === "Perdido").length,
      whatsapp: activos.filter(p => p.canal_origen === "WhatsApp").length,
      instagram: activos.filter(p => p.canal_origen === "Instagram").length,
      facebook: activos.filter(p => p.canal_origen === "Facebook").length,
    };
    return m;
  }, [prospectos]);

  const contactarHoy = useMemo(() => prospectos.filter(isContactarHoy), [prospectos]);

  const filtrados = useMemo(() => {
    return prospectos.filter(p => {
      if (filterCanal !== "Todos" && p.canal_origen !== filterCanal) return false;
      if (filterEstado !== "Todos" && p.estado !== filterEstado) return false;
      if (filterRapida === "activos" && !isActivo(p)) return false;
      if (filterRapida === "convertidos" && p.estado !== "Convertido") return false;
      if (filterRapida === "perdidos" && p.estado !== "Perdido") return false;
      if (filterRapida === "hoy" && !isContactarHoy(p)) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [p.nombre, p.telefono, p.equipo, p.marca_modelo, p.falla_reportada]
          .some(v => v?.toLowerCase().includes(q));
        if (!hay) return false;
      }
      return true;
    });
  }, [prospectos, filterCanal, filterEstado, filterRapida, search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Toaster richColors position="top-right" />
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 grid place-items-center text-white shadow-lg">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Fix Geeks</h1>
              <p className="text-xs text-muted-foreground leading-tight">Prospectos · MVP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsv(prospectos)} className="gap-2 hidden sm:inline-flex">
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2 hidden sm:inline-flex">
              <RefreshCw className="h-4 w-4" /> Demo
            </Button>
            <Button onClick={openNew} size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Nuevo
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="grid grid-cols-2 w-full sm:w-auto">
            <TabsTrigger value="hoy" className="gap-2">
              <Clock className="h-4 w-4" /> Contactar hoy
              {contactarHoy.length > 0 && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">{contactarHoy.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="lista" className="gap-2">
              Todos los prospectos
              <span className="ml-1 rounded-full bg-muted text-muted-foreground text-xs px-1.5 py-0.5">{prospectos.length}</span>
            </TabsTrigger>
          </TabsList>

          {/* DASHBOARD / HOY */}
          <TabsContent value="hoy" className="space-y-6 pt-4">
            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Metric icon={<TrendingUp className="h-4 w-4" />} label="Activos" value={metrics.activos} color="text-primary" />
              <Metric icon={<Plus className="h-4 w-4" />} label="Nuevos" value={metrics.nuevos} color="text-sky-600" />
              <Metric icon={<Clock className="h-4 w-4" />} label="Seguimiento" value={metrics.seguimiento} color="text-amber-600" />
              <Metric icon={<AlertCircle className="h-4 w-4" />} label="Incompletos" value={metrics.incompleta} color="text-orange-600" />
              <Metric icon={<Calendar className="h-4 w-4" />} label="Con visita" value={metrics.visita} color="text-violet-600" />
              <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Convertidos" value={metrics.convertidos} color="text-emerald-600" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CanalCard icon={<MessageSquare className="h-4 w-4" />} label="WhatsApp" value={metrics.whatsapp} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
              <CanalCard icon={<Instagram className="h-4 w-4" />} label="Instagram" value={metrics.instagram} color="bg-pink-50 text-pink-700 border-pink-200" />
              <CanalCard icon={<Facebook className="h-4 w-4" />} label="Facebook" value={metrics.facebook} color="bg-blue-50 text-blue-700 border-blue-200" />
              <CanalCard icon={<XCircle className="h-4 w-4" />} label="Perdidos" value={metrics.perdidos} color="bg-rose-50 text-rose-700 border-rose-200" />
            </div>

            {/* Contactar hoy */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" /> Contactar hoy
                  </h2>
                  <p className="text-sm text-muted-foreground">Prospectos que requieren tu atención ahora</p>
                </div>
              </div>

              {contactarHoy.length === 0 ? (
                <Card className="p-10 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-medium">¡Todo al día!</p>
                  <p className="text-sm text-muted-foreground">No hay prospectos pendientes de contactar hoy.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {contactarHoy.map(p => (
                    <ContactarCard
                      key={p.id}
                      p={p}
                      onEdit={() => openEdit(p, "datos")}
                      onSeguimiento={() => openEdit(p, "historial")}
                      onCopy={() => copiarMensaje(p)}
                    />
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          {/* LISTA */}
          <TabsContent value="lista" className="space-y-4 pt-4">
            <Card className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nombre, teléfono, equipo, modelo o falla..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={filterCanal} onValueChange={setFilterCanal}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos los canales</SelectItem>
                    {CANALES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos los estados</SelectItem>
                    {ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterRapida} onValueChange={setFilterRapida}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="activos">Solo activos</SelectItem>
                    <SelectItem value="convertidos">Solo convertidos</SelectItem>
                    <SelectItem value="perdidos">Solo perdidos</SelectItem>
                    <SelectItem value="hoy">Solo contactar hoy</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => exportCsv(filtrados)} className="gap-2 sm:hidden">
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left p-3">Prospecto</th>
                      <th className="text-left p-3">Canal</th>
                      <th className="text-left p-3">Equipo</th>
                      <th className="text-left p-3">Estado</th>
                      <th className="text-left p-3">Próximo paso</th>
                      <th className="text-left p-3">Seguimiento</th>
                      <th className="text-left p-3">Atendió</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.length === 0 && (
                      <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">Sin resultados</td></tr>
                    )}
                    {filtrados.map(p => (
                      <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="font-medium">{p.nombre}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {p.telefono}
                          </div>
                        </td>
                        <td className="p-3"><ChannelBadge canal={p.canal_origen} /></td>
                        <td className="p-3">
                          <div>{p.equipo}</div>
                          <div className="text-xs text-muted-foreground">{p.marca_modelo}</div>
                        </td>
                        <td className="p-3"><StatusBadge estado={p.estado} /></td>
                        <td className="p-3 max-w-[180px]">
                          <div className="truncate">{p.proximo_paso || "—"}</div>
                          <div className="text-xs text-muted-foreground truncate">Últ: {p.ultima_accion || "—"}</div>
                        </td>
                        <td className="p-3 text-xs">{p.fecha_proximo_seguimiento || "—"}</td>
                        <td className="p-3 text-xs">{p.persona_que_atendio || "—"}</td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => copiarMensaje(p)} title="Copiar mensaje"><Copy className="h-4 w-4" /></Button>
                            <Button size="sm" variant="outline" onClick={() => openEdit(p)} className="gap-1"><Pencil className="h-3 w-3" /> Ver</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <ProspectoDialog
        open={open}
        onClose={() => setOpen(false)}
        prospecto={editing}
        seguimientos={seguimientos}
        initialTab={initialTab}
        onSave={upsert}
        onAddSeguimiento={addSeguimiento}
      />
    </div>
  );
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card className="p-4">
      <div className={`flex items-center gap-1.5 ${color}`}>{icon}<span className="text-xs font-medium uppercase tracking-wide">{label}</span></div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}

function CanalCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">{icon} {label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}

function ContactarCard({ p, onEdit, onSeguimiento, onCopy }: { p: Prospecto; onEdit: () => void; onSeguimiento: () => void; onCopy: () => void }) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-primary">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-semibold">{p.nombre}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.telefono}</span>
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{p.persona_que_atendio || "—"}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <ChannelBadge canal={p.canal_origen} />
          <StatusBadge estado={p.estado} />
        </div>
      </div>
      <div className="text-sm mb-2">
        <span className="font-medium">{p.equipo}</span>
        <span className="text-muted-foreground"> · {p.marca_modelo}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 rounded p-2 mb-3">
        <div>
          <div className="text-muted-foreground">Última acción</div>
          <div className="font-medium truncate">{p.ultima_accion || "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Próximo paso</div>
          <div className="font-medium truncate">{p.proximo_paso || "—"}</div>
        </div>
      </div>
      {p.fecha_proximo_seguimiento && (
        <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
          <Calendar className="h-3 w-3" /> Seguimiento: {p.fecha_proximo_seguimiento}
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={onEdit} className="gap-1 flex-1"><Pencil className="h-3 w-3" /> Ver / editar</Button>
        <Button size="sm" variant="outline" onClick={onSeguimiento} className="gap-1"><Plus className="h-3 w-3" /> Seguimiento</Button>
        <Button size="sm" variant="outline" onClick={onCopy} title="Copiar mensaje"><Copy className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}
