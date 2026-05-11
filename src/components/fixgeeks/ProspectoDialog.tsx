import { useState, useEffect } from "react";
import {
  Prospecto, Seguimiento, CANALES, ESTADOS, PROXIMOS_PASOS,
  RESULTADOS_SEGUIMIENTO, MOTIVOS_PERDIDA, uid, nowIso, isActivo, buildMensaje,
} from "@/lib/prospectos";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChannelBadge, StatusBadge } from "./Badges";
import { toast } from "sonner";
import { Copy, CheckCircle2, XCircle, Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  prospecto: Prospecto | null;
  seguimientos: Seguimiento[];
  onSave: (p: Prospecto) => void;
  onAddSeguimiento: (s: Seguimiento, updates?: Partial<Prospecto>) => void;
}

const blankProspecto = (): Prospecto => ({
  id: uid(),
  nombre: "", telefono: "", canal_origen: "WhatsApp",
  equipo: "", marca_modelo: "", falla_reportada: "",
  fotos_recibidas: false, fecha_contacto: new Date().toISOString().slice(0, 10),
  persona_que_atendio: "",
  estado: "Nuevo", ultima_accion: "", proximo_paso: "Pedir modelo",
  fecha_proximo_seguimiento: null,
  fecha_conversion: null, referencia_orden_gestioo: null, comentario_conversion: null,
  fecha_perdido: null, motivo_perdido: null, comentario_perdido: null,
  created_at: nowIso(), updated_at: nowIso(),
});

export function ProspectoDialog({ open, onClose, prospecto, seguimientos, onSave, onAddSeguimiento }: Props) {
  const [form, setForm] = useState<Prospecto>(prospecto ?? blankProspecto());
  const [tab, setTab] = useState("datos");

  useEffect(() => {
    setForm(prospecto ?? blankProspecto());
    setTab("datos");
  }, [prospecto, open]);

  const set = <K extends keyof Prospecto>(k: K, v: Prospecto[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.nombre.trim()) return toast.error("Nombre requerido");
    if (!form.telefono.trim()) return toast.error("Teléfono requerido");
    if (!form.equipo.trim()) return toast.error("Equipo requerido");
    if (isActivo(form) && !form.proximo_paso.trim())
      return toast.error("Un prospecto activo debe tener próximo paso");
    onSave({ ...form, updated_at: nowIso() });
    toast.success("Prospecto guardado");
    onClose();
  };

  const markConvertido = () => {
    const today = new Date().toISOString().slice(0, 10);
    const updated: Prospecto = {
      ...form, estado: "Convertido", fecha_conversion: today,
      ultima_accion: "Prospecto convertido", proximo_paso: "",
      updated_at: nowIso(),
    };
    setForm(updated);
    onSave(updated);
    onAddSeguimiento({
      id: uid(), prospecto_id: updated.id, fecha: nowIso(),
      canal: updated.canal_origen, accion: "Prospecto convertido",
      comentario: updated.comentario_conversion || "", usuario: updated.persona_que_atendio,
      resultado: "Convertido",
    });
    toast.success("Marcado como convertido");
    onClose();
  };

  const markPerdido = () => {
    if (!form.motivo_perdido) return toast.error("Selecciona un motivo de pérdida");
    const today = new Date().toISOString().slice(0, 10);
    const updated: Prospecto = {
      ...form, estado: "Perdido", fecha_perdido: today,
      ultima_accion: "Prospecto marcado como perdido", proximo_paso: "",
      updated_at: nowIso(),
    };
    setForm(updated);
    onSave(updated);
    onAddSeguimiento({
      id: uid(), prospecto_id: updated.id, fecha: nowIso(),
      canal: updated.canal_origen, accion: "Prospecto marcado como perdido",
      comentario: updated.comentario_perdido || "", usuario: updated.persona_que_atendio,
      resultado: "Perdido",
    });
    toast.success("Marcado como perdido");
    onClose();
  };

  const copiarMensaje = async () => {
    await navigator.clipboard.writeText(buildMensaje(form));
    toast.success("Mensaje copiado");
  };

  const segs = seguimientos.filter(s => s.prospecto_id === form.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  // new seguimiento form state
  const [nuevo, setNuevo] = useState({
    canal: form.canal_origen, accion: PROXIMOS_PASOS[0], comentario: "",
    usuario: "", resultado: RESULTADOS_SEGUIMIENTO[0],
    nuevoEstado: form.estado as string, nuevoProximo: form.proximo_paso,
    nuevaFecha: form.fecha_proximo_seguimiento ?? "",
  });
  useEffect(() => {
    setNuevo({
      canal: form.canal_origen, accion: PROXIMOS_PASOS[0], comentario: "",
      usuario: form.persona_que_atendio, resultado: RESULTADOS_SEGUIMIENTO[0],
      nuevoEstado: form.estado, nuevoProximo: form.proximo_paso,
      nuevaFecha: form.fecha_proximo_seguimiento ?? "",
    });
  }, [form.id, form.canal_origen, form.persona_que_atendio]);

  const addSeguimiento = () => {
    if (!nuevo.accion) return toast.error("Acción requerida");
    const s: Seguimiento = {
      id: uid(), prospecto_id: form.id, fecha: nowIso(),
      canal: nuevo.canal as Seguimiento["canal"], accion: nuevo.accion,
      comentario: nuevo.comentario, usuario: nuevo.usuario, resultado: nuevo.resultado,
    };
    const updates: Partial<Prospecto> = {
      ultima_accion: nuevo.accion,
      estado: nuevo.nuevoEstado as Prospecto["estado"],
      proximo_paso: nuevo.nuevoProximo,
      fecha_proximo_seguimiento: nuevo.nuevaFecha || null,
      updated_at: nowIso(),
    };
    setForm(f => ({ ...f, ...updates }));
    onAddSeguimiento(s, updates);
    setNuevo(n => ({ ...n, comentario: "" }));
    toast.success("Seguimiento agregado");
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {prospecto ? "Editar prospecto" : "Nuevo prospecto"}
            {prospecto && <StatusBadge estado={form.estado} />}
            {prospecto && <ChannelBadge canal={form.canal_origen} />}
          </DialogTitle>
          <DialogDescription>
            {prospecto ? "Actualiza datos, registra seguimientos y conversión." : "Captura un nuevo prospecto."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="datos">Datos</TabsTrigger>
            <TabsTrigger value="comercial">Comercial</TabsTrigger>
            <TabsTrigger value="cierre">Cierre</TabsTrigger>
            <TabsTrigger value="historial" disabled={!prospecto}>
              Historial {prospecto ? `(${segs.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="datos" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre"><Input value={form.nombre} onChange={e => set("nombre", e.target.value)} /></Field>
              <Field label="Teléfono"><Input value={form.telefono} onChange={e => set("telefono", e.target.value)} /></Field>
              <Field label="Canal de origen">
                <Select value={form.canal_origen} onValueChange={v => set("canal_origen", v as Prospecto["canal_origen"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CANALES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Persona que atendió"><Input value={form.persona_que_atendio} onChange={e => set("persona_que_atendio", e.target.value)} /></Field>
              <Field label="Equipo"><Input placeholder="Laptop, PC, Consola, Tarjeta madre..." value={form.equipo} onChange={e => set("equipo", e.target.value)} /></Field>
              <Field label="Marca / modelo"><Input value={form.marca_modelo} onChange={e => set("marca_modelo", e.target.value)} /></Field>
              <Field label="Fecha de contacto"><Input type="date" value={form.fecha_contacto} onChange={e => set("fecha_contacto", e.target.value)} /></Field>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.fotos_recibidas} onCheckedChange={v => set("fotos_recibidas", v)} />
                <Label>Fotos recibidas</Label>
              </div>
            </div>
            <Field label="Falla reportada">
              <Textarea rows={3} value={form.falla_reportada} onChange={e => set("falla_reportada", e.target.value)} />
            </Field>
          </TabsContent>

          <TabsContent value="comercial" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Estado">
                <Select value={form.estado} onValueChange={v => set("estado", v as Prospecto["estado"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Próximo paso">
                <Select value={form.proximo_paso} onValueChange={v => set("proximo_paso", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>{PROXIMOS_PASOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Última acción"><Input value={form.ultima_accion} onChange={e => set("ultima_accion", e.target.value)} /></Field>
              <Field label="Fecha de próximo seguimiento">
                <Input type="date" value={form.fecha_proximo_seguimiento ?? ""} onChange={e => set("fecha_proximo_seguimiento", e.target.value || null)} />
              </Field>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              <strong>Última acción</strong> = lo que ya pasó. <strong>Próximo paso</strong> = lo que toca hacer.
            </div>
            <Button variant="outline" onClick={copiarMensaje} className="gap-2">
              <Copy className="h-4 w-4" /> Copiar mensaje de seguimiento
            </Button>
          </TabsContent>

          <TabsContent value="cierre" className="space-y-6 pt-4">
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Conversión
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Fecha de conversión"><Input type="date" value={form.fecha_conversion ?? ""} onChange={e => set("fecha_conversion", e.target.value || null)} /></Field>
                <Field label="Referencia orden Gestioo (opcional)"><Input value={form.referencia_orden_gestioo ?? ""} onChange={e => set("referencia_orden_gestioo", e.target.value || null)} /></Field>
              </div>
              <Field label="Comentario (opcional)"><Textarea rows={2} value={form.comentario_conversion ?? ""} onChange={e => set("comentario_conversion", e.target.value || null)} /></Field>
              <Button onClick={markConvertido} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <CheckCircle2 className="h-4 w-4" /> Marcar como convertido
              </Button>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-rose-700">
                <XCircle className="h-4 w-4" /> Pérdida
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Fecha de pérdida"><Input type="date" value={form.fecha_perdido ?? ""} onChange={e => set("fecha_perdido", e.target.value || null)} /></Field>
                <Field label="Motivo">
                  <Select value={form.motivo_perdido ?? ""} onValueChange={v => set("motivo_perdido", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona motivo" /></SelectTrigger>
                    <SelectContent>{MOTIVOS_PERDIDA.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Comentario (opcional)"><Textarea rows={2} value={form.comentario_perdido ?? ""} onChange={e => set("comentario_perdido", e.target.value || null)} /></Field>
              <Button onClick={markPerdido} variant="destructive" className="gap-2">
                <XCircle className="h-4 w-4" /> Marcar como perdido
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="historial" className="space-y-4 pt-4">
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              <h3 className="font-semibold text-sm">Agregar seguimiento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Canal">
                  <Select value={nuevo.canal} onValueChange={v => setNuevo(n => ({ ...n, canal: v as Seguimiento["canal"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CANALES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Acción">
                  <Select value={nuevo.accion} onValueChange={v => setNuevo(n => ({ ...n, accion: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROXIMOS_PASOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Resultado">
                  <Select value={nuevo.resultado} onValueChange={v => setNuevo(n => ({ ...n, resultado: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RESULTADOS_SEGUIMIENTO.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Usuario"><Input value={nuevo.usuario} onChange={e => setNuevo(n => ({ ...n, usuario: e.target.value }))} /></Field>
              </div>
              <Field label="Comentario"><Textarea rows={2} value={nuevo.comentario} onChange={e => setNuevo(n => ({ ...n, comentario: e.target.value }))} /></Field>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Nuevo estado">
                  <Select value={nuevo.nuevoEstado} onValueChange={v => setNuevo(n => ({ ...n, nuevoEstado: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Nuevo próximo paso">
                  <Select value={nuevo.nuevoProximo} onValueChange={v => setNuevo(n => ({ ...n, nuevoProximo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROXIMOS_PASOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Próximo seguimiento">
                  <Input type="date" value={nuevo.nuevaFecha} onChange={e => setNuevo(n => ({ ...n, nuevaFecha: e.target.value }))} />
                </Field>
              </div>
              <Button onClick={addSeguimiento} className="gap-2"><Plus className="h-4 w-4" /> Agregar seguimiento</Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Seguimientos anteriores ({segs.length})</h3>
              {segs.length === 0 && <p className="text-sm text-muted-foreground">Sin seguimientos aún.</p>}
              {segs.map(s => (
                <div key={s.id} className="rounded-lg border p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <ChannelBadge canal={s.canal} />
                      <span className="font-medium">{s.accion}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(s.fecha).toLocaleString()}</span>
                  </div>
                  {s.comentario && <p className="text-muted-foreground">{s.comentario}</p>}
                  <p className="text-xs text-muted-foreground">
                    {s.usuario || "—"} · Resultado: <span className="font-medium text-foreground">{s.resultado}</span>
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
