import { useState, useEffect } from "react";
import {
  Prospecto,
  Seguimiento,
  TipoCaptura,
  CANALES,
  ESTADOS_ASIGNABLES,
  PROXIMOS_PASOS,
  ACCIONES,
  RESULTADOS_SEGUIMIENTO,
  MOTIVOS_PERDIDA,
  uid,
  nowIso,
  isActivo,
  buildMensaje,
} from "@/lib/prospectos";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChannelBadge, StatusBadge } from "./Badges";
import { toast } from "sonner";
import { Copy, CheckCircle2, XCircle, Plus } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  prospecto: Prospecto | null;
  seguimientos: Seguimiento[];
  initialTab?: string;
  onSave: (p: Prospecto) => void;
  onAddSeguimiento: (s: Seguimiento, updates?: Partial<Prospecto>) => void;
}

const blankProspecto = (): Prospecto => ({
  id: uid(),
  nombre: "",
  telefono: "",
  canal_origen: "WhatsApp",
  equipo: "",
  marca_modelo: "",
  falla_reportada: "",
  fotos_recibidas: false,
  fecha_contacto: new Date().toISOString().slice(0, 10),
  persona_que_atendio: "",
  estado: "Nuevo",
  ultima_accion: "Prospecto registrado",
  accion_personalizada: null,
  comentario_ultima_accion: "Captura inicial del prospecto",
  proximo_paso: "Pedir modelo",
  fecha_proximo_seguimiento: null,
  tipo_captura: "nuevo",
  fecha_conversion: null,
  referencia_orden_gestioo: null,
  comentario_conversion: null,
  fecha_perdido: null,
  motivo_perdido: null,
  comentario_perdido: null,
  created_at: nowIso(),
  updated_at: nowIso(),
});

export function ProspectoDialog({
  open,
  onClose,
  prospecto,
  seguimientos,
  initialTab,
  onSave,
  onAddSeguimiento,
}: Props) {
  const [form, setForm] = useState<Prospecto>(prospecto ?? blankProspecto());
  const [tab, setTab] = useState("datos");
  const [resultadoInicial, setResultadoInicial] = useState<string>("Nuevo");

  useEffect(() => {
    if (open) {
      const base = prospecto ?? blankProspecto();
      setForm(base);
      setTab(initialTab || "datos");
      setResultadoInicial(base.estado === "Nuevo" ? "Nuevo" : "Respondió");
    }
  }, [prospecto, open, initialTab]);

  const isNew = !prospecto;
  const isClosed = form.estado === "Convertido" || form.estado === "Perdido";
  const isTipoNuevo = form.tipo_captura === "nuevo";
  const set = <K extends keyof Prospecto>(k: K, v: Prospecto[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ===== Guardar (crear o editar) =====
  const handleSave = () => {
    const errors: string[] = [];
    if (!form.nombre.trim()) errors.push("nombre");
    if (!form.telefono.trim()) errors.push("teléfono");
    if (!form.canal_origen) errors.push("canal de origen");
    if (!form.persona_que_atendio.trim()) errors.push("persona que atendió");
    if (!form.equipo.trim()) errors.push("equipo");
    if (!form.falla_reportada.trim()) errors.push("falla reportada");
    if (!form.estado) errors.push("estado");

    const accionFinal =
      form.ultima_accion === "Otra" ? (form.accion_personalizada || "").trim() : form.ultima_accion;

    if (isActivo(form)) {
      if (!form.ultima_accion) errors.push("última acción");
      if (form.ultima_accion === "Otra" && !accionFinal) errors.push("acción personalizada");
      if (!form.proximo_paso.trim()) errors.push("próximo paso");
    }

    if (isNew && form.tipo_captura === "nuevo") {
      if (form.ultima_accion !== "Prospecto registrado")
        errors.push("última acción inválida para captura nueva");
      if (form.comentario_ultima_accion !== "Captura inicial del prospecto")
        errors.push("comentario de última acción inválido para captura nueva");
    }

    if (form.tipo_captura === "captura_manual") {
      if (!form.ultima_accion) errors.push("última acción");
      if (form.ultima_accion === "Otra" && !accionFinal) errors.push("acción personalizada");
    }

    if (isNew && form.tipo_captura === "captura_manual" && !resultadoInicial) {
      errors.push("resultado inicial");
    }

    if (errors.length) {
      toast.error("Faltan campos: " + errors.join(", "));
      return;
    }

    const finalForm: Prospecto = {
      ...form,
      ultima_accion: accionFinal || form.ultima_accion,
      accion_personalizada: form.ultima_accion === "Otra" ? accionFinal : null,
      updated_at: nowIso(),
    };

    onSave(finalForm);

    // Crear seguimiento inicial automático si es nuevo
    if (isNew) {
      const esNuevo = finalForm.tipo_captura === "nuevo";
      onAddSeguimiento({
        id: uid(),
        prospecto_id: finalForm.id,
        fecha: nowIso(),
        canal: finalForm.canal_origen,
        accion: esNuevo ? "Prospecto registrado" : finalForm.ultima_accion,
        comentario: esNuevo
          ? "Captura inicial del prospecto"
          : finalForm.comentario_ultima_accion || "",
        usuario: finalForm.persona_que_atendio,
        resultado: esNuevo ? "Nuevo" : resultadoInicial,
      });
    }

    toast.success(isNew ? "Prospecto creado" : "Prospecto guardado");
    onClose();
  };

  const markConvertido = () => {
    const today = new Date().toISOString().slice(0, 10);
    const updated: Prospecto = {
      ...form,
      estado: "Convertido",
      fecha_conversion: today,
      ultima_accion: "Prospecto convertido",
      accion_personalizada: null,
      comentario_ultima_accion: form.comentario_conversion || form.comentario_ultima_accion,
      proximo_paso: "",
      updated_at: nowIso(),
    };
    setForm(updated);
    onSave(updated);
    onAddSeguimiento({
      id: uid(),
      prospecto_id: updated.id,
      fecha: nowIso(),
      canal: updated.canal_origen,
      accion: "Prospecto convertido",
      comentario: updated.comentario_conversion || "",
      usuario: updated.persona_que_atendio,
      resultado: "Convertido",
    });
    toast.success("Marcado como convertido");
    onClose();
  };

  const markPerdido = () => {
    if (!form.motivo_perdido) return toast.error("Selecciona un motivo de pérdida");
    const today = new Date().toISOString().slice(0, 10);
    const updated: Prospecto = {
      ...form,
      estado: "Perdido",
      fecha_perdido: today,
      ultima_accion: "Prospecto marcado como perdido",
      accion_personalizada: null,
      comentario_ultima_accion: form.comentario_perdido || form.comentario_ultima_accion,
      proximo_paso: "",
      updated_at: nowIso(),
    };
    setForm(updated);
    onSave(updated);
    onAddSeguimiento({
      id: uid(),
      prospecto_id: updated.id,
      fecha: nowIso(),
      canal: updated.canal_origen,
      accion: "Prospecto marcado como perdido",
      comentario: updated.comentario_perdido || "",
      usuario: updated.persona_que_atendio,
      resultado: "Perdido",
    });
    toast.success("Marcado como perdido");
    onClose();
  };

  const copiarMensaje = async () => {
    await navigator.clipboard.writeText(buildMensaje(form));
    toast.success("Mensaje copiado");
  };

  const segs = seguimientos
    .filter((s) => s.prospecto_id === form.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  // ===== Form de seguimiento nuevo =====
  const [nuevo, setNuevo] = useState({
    canal: form.canal_origen as string,
    accion: "Se dio seguimiento" as string,
    accion_personalizada: "",
    comentario: "",
    usuario: "",
    resultado: "Respondió" as string,
    nuevoEstado: form.estado as string,
    nuevoProximo: form.proximo_paso,
    nuevaFecha: form.fecha_proximo_seguimiento ?? "",
  });
  useEffect(() => {
    setNuevo({
      canal: form.canal_origen,
      accion: "Se dio seguimiento",
      accion_personalizada: "",
      comentario: "",
      usuario: form.persona_que_atendio,
      resultado: "Respondió",
      nuevoEstado: form.estado,
      nuevoProximo: form.proximo_paso,
      nuevaFecha: form.fecha_proximo_seguimiento ?? "",
    });
  }, [form.id, form.canal_origen, form.persona_que_atendio]);

  const addSeguimiento = () => {
    if (!nuevo.accion) return toast.error("Acción requerida");
    const accionFinal = nuevo.accion === "Otra" ? nuevo.accion_personalizada.trim() : nuevo.accion;
    if (nuevo.accion === "Otra" && !accionFinal)
      return toast.error("Captura la acción personalizada");

    const s: Seguimiento = {
      id: uid(),
      prospecto_id: form.id,
      fecha: nowIso(),
      canal: nuevo.canal as Seguimiento["canal"],
      accion: accionFinal,
      comentario: nuevo.comentario,
      usuario: nuevo.usuario,
      resultado: nuevo.resultado,
    };
    const updates: Partial<Prospecto> = isClosed
      ? {
          ultima_accion: accionFinal,
          accion_personalizada: nuevo.accion === "Otra" ? accionFinal : null,
          comentario_ultima_accion: nuevo.comentario || null,
          updated_at: nowIso(),
        }
      : {
          ultima_accion: accionFinal,
          accion_personalizada: nuevo.accion === "Otra" ? accionFinal : null,
          comentario_ultima_accion: nuevo.comentario || null,
          estado: nuevo.nuevoEstado as Prospecto["estado"],
          proximo_paso: nuevo.nuevoProximo,
          fecha_proximo_seguimiento: nuevo.nuevaFecha || null,
          updated_at: nowIso(),
        };
    setForm((f) => ({ ...f, ...updates }));
    onAddSeguimiento(s, updates);
    setNuevo((n) => ({ ...n, comentario: "", accion_personalizada: "" }));
    toast.success("Seguimiento agregado");
  };

  // Estados disponibles en selector: asignables + el actual si ya es Convertido/Perdido
  const estadosUI =
    form.estado === "Convertido" || form.estado === "Perdido"
      ? [form.estado, ...ESTADOS_ASIGNABLES]
      : ESTADOS_ASIGNABLES;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            {prospecto ? "Editar prospecto" : "Nuevo prospecto"}
            {prospecto && <StatusBadge estado={form.estado} />}
            {prospecto && <ChannelBadge canal={form.canal_origen} />}
          </DialogTitle>
          <DialogDescription>
            {prospecto
              ? "Actualiza datos, registra seguimientos y conversión."
              : "Captura un nuevo prospecto."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="datos">Datos</TabsTrigger>
            <TabsTrigger value="comercial">Comercial</TabsTrigger>
            <TabsTrigger value="cierre" disabled={!prospecto}>
              Cierre
            </TabsTrigger>
            <TabsTrigger value="historial" disabled={!prospecto}>
              Historial {prospecto ? `(${segs.length})` : ""}
            </TabsTrigger>
          </TabsList>

          {/* ===== DATOS ===== */}
          <TabsContent value="datos" className="space-y-4 pt-4">
            {isNew && (
              <div className="rounded-lg border bg-primary/5 p-3 space-y-2">
                <Label className="text-sm font-semibold">Tipo de captura</Label>
                <Select
                  value={form.tipo_captura}
                  onValueChange={(v) => {
                    const tipo = v as TipoCaptura;
                    if (tipo === "nuevo") {
                      setForm((f) => ({
                        ...f,
                        tipo_captura: "nuevo",
                        estado: "Nuevo",
                        ultima_accion: "Prospecto registrado",
                        accion_personalizada: null,
                        comentario_ultima_accion: "Captura inicial del prospecto",
                      }));
                      setResultadoInicial("Nuevo");
                      return;
                    }
                    setForm((f) => ({
                      ...f,
                      tipo_captura: "captura_manual",
                      estado: f.estado === "Nuevo" ? "Contactado" : f.estado,
                      ultima_accion:
                        f.ultima_accion === "Prospecto registrado"
                          ? "Mensaje recibido"
                          : f.ultima_accion,
                      comentario_ultima_accion:
                        f.comentario_ultima_accion === "Captura inicial del prospecto"
                          ? null
                          : f.comentario_ultima_accion,
                    }));
                    setResultadoInicial("Respondió");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuevo">Prospecto nuevo sin seguimiento previo</SelectItem>
                    <SelectItem value="captura_manual">
                      Prospecto ya atendido / captura manual
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {form.tipo_captura === "nuevo"
                    ? "Se creará un seguimiento inicial automático: 'Prospecto registrado'."
                    : "Captura la última acción y resultado en la pestaña Comercial. Se creará un primer seguimiento con esos datos."}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre *">
                <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
              </Field>
              <Field label="Teléfono *">
                <Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
              </Field>
              <Field label="Canal de origen *">
                <Select
                  value={form.canal_origen}
                  onValueChange={(v) => set("canal_origen", v as Prospecto["canal_origen"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANALES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Persona que atendió *">
                <Input
                  value={form.persona_que_atendio}
                  onChange={(e) => set("persona_que_atendio", e.target.value)}
                />
              </Field>
              <Field label="Equipo *">
                <Input
                  placeholder="Laptop, PC, Consola, Tarjeta madre..."
                  value={form.equipo}
                  onChange={(e) => set("equipo", e.target.value)}
                />
              </Field>
              <Field label="Marca / modelo">
                <Input
                  value={form.marca_modelo}
                  onChange={(e) => set("marca_modelo", e.target.value)}
                />
              </Field>
              <Field label="Fecha de contacto">
                <Input
                  type="date"
                  value={form.fecha_contacto}
                  onChange={(e) => set("fecha_contacto", e.target.value)}
                />
              </Field>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={form.fotos_recibidas}
                  onCheckedChange={(v) => set("fotos_recibidas", v)}
                />
                <Label>Fotos recibidas</Label>
              </div>
            </div>
            <Field label="Falla reportada *">
              <Textarea
                rows={3}
                value={form.falla_reportada}
                onChange={(e) => set("falla_reportada", e.target.value)}
              />
            </Field>
          </TabsContent>

          {/* ===== COMERCIAL ===== */}
          <TabsContent value="comercial" className="space-y-4 pt-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              <strong>Última acción</strong> = lo que ya ocurrió. <strong>Próximo paso</strong> = lo
              que toca hacer.
              <br />
              Ej.: Última acción: <em>Se mandó ubicación</em>. Próximo paso:{" "}
              <em>Confirmar si vendrá hoy</em>.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Estado *">
                <Select
                  value={form.estado}
                  onValueChange={(v) => set("estado", v as Prospecto["estado"])}
                >
                  <SelectTrigger disabled={isClosed}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosUI.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Para Convertido / Perdido usa los botones en la pestaña Cierre.
                </p>
              </Field>
              <Field label="Próximo paso *">
                <Select value={form.proximo_paso} onValueChange={(v) => set("proximo_paso", v)}>
                  <SelectTrigger disabled={isClosed}>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROXIMOS_PASOS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Última acción *">
                <Select
                  value={
                    ACCIONES.includes(form.ultima_accion as (typeof ACCIONES)[number])
                      ? form.ultima_accion
                      : "Otra"
                  }
                  onValueChange={(v) => {
                    if (isTipoNuevo) return;
                    if (v === "Otra") {
                      set("ultima_accion", "Otra");
                    } else {
                      set("ultima_accion", v);
                      set("accion_personalizada", null);
                    }
                  }}
                >
                  <SelectTrigger disabled={isTipoNuevo}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCIONES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fecha de próximo seguimiento">
                <Input
                  disabled={isClosed}
                  type="date"
                  value={form.fecha_proximo_seguimiento ?? ""}
                  onChange={(e) => set("fecha_proximo_seguimiento", e.target.value || null)}
                />
              </Field>
            </div>

            {!isTipoNuevo && form.ultima_accion === "Otra" && (
              <Field label="Acción personalizada *">
                <Input
                  value={form.accion_personalizada ?? ""}
                  onChange={(e) => set("accion_personalizada", e.target.value)}
                  placeholder="Describe la acción..."
                />
              </Field>
            )}

            <Field label="Comentario de la acción">
              <Textarea
                rows={2}
                placeholder="Detalle libre de lo último que ocurrió"
                value={form.comentario_ultima_accion ?? ""}
                disabled={isTipoNuevo}
                onChange={(e) => set("comentario_ultima_accion", e.target.value || null)}
              />
            </Field>

            {isNew && form.tipo_captura === "captura_manual" && (
              <Field label="Resultado inicial *">
                <Select value={resultadoInicial} onValueChange={setResultadoInicial}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESULTADOS_SEGUIMIENTO.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Button variant="outline" onClick={copiarMensaje} className="gap-2" disabled={isNew}>
              <Copy className="h-4 w-4" /> Copiar mensaje de seguimiento
            </Button>
          </TabsContent>

          {/* ===== CIERRE ===== */}
          <TabsContent value="cierre" className="space-y-6 pt-4">
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Conversión
              </h3>
              <Field label="Referencia orden Gestioo (opcional)">
                <Input
                  value={form.referencia_orden_gestioo ?? ""}
                  onChange={(e) => set("referencia_orden_gestioo", e.target.value || null)}
                />
              </Field>
              <Field label="Comentario (opcional)">
                <Textarea
                  rows={2}
                  value={form.comentario_conversion ?? ""}
                  onChange={(e) => set("comentario_conversion", e.target.value || null)}
                />
              </Field>
              <Button
                onClick={markConvertido}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                <CheckCircle2 className="h-4 w-4" /> Marcar como convertido
              </Button>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-rose-700">
                <XCircle className="h-4 w-4" /> Pérdida
              </h3>
              <Field label="Motivo *">
                <Select
                  value={form.motivo_perdido ?? ""}
                  onValueChange={(v) => set("motivo_perdido", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_PERDIDA.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Comentario (opcional)">
                <Textarea
                  rows={2}
                  value={form.comentario_perdido ?? ""}
                  onChange={(e) => set("comentario_perdido", e.target.value || null)}
                />
              </Field>
              <Button onClick={markPerdido} variant="destructive" className="gap-2">
                <XCircle className="h-4 w-4" /> Marcar como perdido
              </Button>
            </div>
          </TabsContent>

          {/* ===== HISTORIAL ===== */}
          <TabsContent value="historial" className="space-y-4 pt-4">
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              <h3 className="font-semibold text-sm">
                {isClosed ? "Agregar nota histórica" : "Agregar seguimiento"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Canal">
                  <Select
                    value={nuevo.canal}
                    onValueChange={(v) => setNuevo((n) => ({ ...n, canal: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CANALES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Acción">
                  <Select
                    value={nuevo.accion}
                    onValueChange={(v) => setNuevo((n) => ({ ...n, accion: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCIONES.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {nuevo.accion === "Otra" && (
                  <Field label="Acción personalizada">
                    <Input
                      value={nuevo.accion_personalizada}
                      onChange={(e) =>
                        setNuevo((n) => ({ ...n, accion_personalizada: e.target.value }))
                      }
                    />
                  </Field>
                )}
                <Field label="Resultado">
                  <Select
                    value={nuevo.resultado}
                    onValueChange={(v) => setNuevo((n) => ({ ...n, resultado: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESULTADOS_SEGUIMIENTO.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Usuario">
                  <Input
                    value={nuevo.usuario}
                    onChange={(e) => setNuevo((n) => ({ ...n, usuario: e.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Comentario">
                <Textarea
                  rows={2}
                  value={nuevo.comentario}
                  onChange={(e) => setNuevo((n) => ({ ...n, comentario: e.target.value }))}
                />
              </Field>
              {!isClosed && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Nuevo estado (opcional)">
                    <Select
                      value={nuevo.nuevoEstado}
                      onValueChange={(v) => setNuevo((n) => ({ ...n, nuevoEstado: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {estadosUI.map((e) => (
                          <SelectItem key={e} value={e}>
                            {e}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Nuevo próximo paso (opcional)">
                    <Select
                      value={nuevo.nuevoProximo}
                      onValueChange={(v) => setNuevo((n) => ({ ...n, nuevoProximo: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROXIMOS_PASOS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Próximo seguimiento (opcional)">
                    <Input
                      type="date"
                      value={nuevo.nuevaFecha}
                      onChange={(e) => setNuevo((n) => ({ ...n, nuevaFecha: e.target.value }))}
                    />
                  </Field>
                </div>
              )}
              <Button onClick={addSeguimiento} className="gap-2">
                <Plus className="h-4 w-4" /> Agregar seguimiento
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Seguimientos anteriores ({segs.length})</h3>
              {segs.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin seguimientos aún.</p>
              )}
              {segs.map((s) => (
                <div key={s.id} className="rounded-lg border p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <ChannelBadge canal={s.canal} />
                      <span className="font-medium">{s.accion}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.fecha).toLocaleString()}
                    </span>
                  </div>
                  {s.comentario && <p className="text-muted-foreground">{s.comentario}</p>}
                  <p className="text-xs text-muted-foreground">
                    {s.usuario || "—"} · Resultado:{" "}
                    <span className="font-medium text-foreground">{s.resultado}</span>
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
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
