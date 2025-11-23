import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranding } from "@/contexts/BrandingContext";

interface Empresa {
  id: string;
  nombre: string;
  logo_url: string | null;
  color_primario: string;
}

interface TarifaElectricidad {
  id?: string;
  empresa_id: string;
  potencia_p1: number | null;
  potencia_p2: number | null;
  energia_p1: number | null;
  energia_p2: number | null;
  energia_p3: number | null;
  impuesto_electrico: number | null;
  iva: number | null;
}

interface TarifaGas {
  id?: string;
  empresa_id: string;
  termino_fijo: number | null;
  termino_variable: number | null;
  tarifa_atr: string | null;
  iva: number | null;
}

interface ServicioAdicional {
  id?: string;
  empresa_id: string;
  nombre: string;
  precio_mensual: number | null;
}

const AdminTariffs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { refreshBranding } = useBranding();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);

  const [tarifaElectricidad, setTarifaElectricidad] = useState<TarifaElectricidad>({
    empresa_id: "",
    potencia_p1: null,
    potencia_p2: null,
    energia_p1: null,
    energia_p2: null,
    energia_p3: null,
    impuesto_electrico: null,
    iva: null,
  });

  const [tarifaGas, setTarifaGas] = useState<TarifaGas>({
    empresa_id: "",
    termino_fijo: null,
    termino_variable: null,
    tarifa_atr: null,
    iva: null,
  });

  const [servicios, setServicios] = useState<ServicioAdicional[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Check admin access
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate]);

  // Load empresas
  useEffect(() => {
    loadEmpresas();
  }, []);

  // Load tariffs when empresa selected
  useEffect(() => {
    if (selectedEmpresaId) {
      loadTariffs(selectedEmpresaId);
      const empresa = empresas.find(e => e.id === selectedEmpresaId);
      setSelectedEmpresa(empresa || null);
    }
  }, [selectedEmpresaId, empresas]);

  const loadEmpresas = async () => {
    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .order("nombre");

    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar las empresas", variant: "destructive" });
    } else {
      setEmpresas(data || []);
    }
  };

  const loadTariffs = async (empresaId: string) => {
    // Load electricity tariff
    const { data: elecData } = await supabase
      .from("tarifas_electricidad")
      .select("*")
      .eq("empresa_id", empresaId)
      .single();

    if (elecData) {
      setTarifaElectricidad(elecData);
    } else {
      setTarifaElectricidad({
        empresa_id: empresaId,
        potencia_p1: null,
        potencia_p2: null,
        energia_p1: null,
        energia_p2: null,
        energia_p3: null,
        impuesto_electrico: null,
        iva: null,
      });
    }

    // Load gas tariff
    const { data: gasData } = await supabase
      .from("tarifas_gas")
      .select("*")
      .eq("empresa_id", empresaId)
      .single();

    if (gasData) {
      setTarifaGas(gasData);
    } else {
      setTarifaGas({
        empresa_id: empresaId,
        termino_fijo: null,
        termino_variable: null,
        tarifa_atr: null,
        iva: null,
      });
    }

    // Load additional services
    const { data: serviciosData } = await supabase
      .from("servicios_adicionales")
      .select("*")
      .eq("empresa_id", empresaId);

    setServicios(serviciosData || []);
  };

  const handleSaveEmpresa = async () => {
    if (!selectedEmpresa) return;

    let logoUrl = selectedEmpresa.logo_url;

    // Upload logo if file selected
    if (logoFile) {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${selectedEmpresa.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) {
        toast({ title: "Error", description: "Error al subir logo", variant: "destructive" });
        return;
      }

      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      logoUrl = urlData.publicUrl;
    }

    const { error } = await supabase
      .from("empresas")
      .update({
        nombre: selectedEmpresa.nombre,
        color_primario: selectedEmpresa.color_primario,
        logo_url: logoUrl,
      })
      .eq("id", selectedEmpresa.id);

    if (error) {
      toast({ title: "Error", description: "Error al guardar empresa", variant: "destructive" });
    } else {
      toast({ title: "Guardado", description: "Empresa actualizada correctamente" });
      loadEmpresas();
      refreshBranding();
    }
  };

  const handleSaveElectricidad = async () => {
    const { error } = await supabase
      .from("tarifas_electricidad")
      .upsert({
        ...tarifaElectricidad,
        empresa_id: selectedEmpresaId,
      });

    if (error) {
      toast({ title: "Error", description: "Error al guardar tarifa eléctrica", variant: "destructive" });
    } else {
      toast({ title: "Guardado", description: "Tarifa eléctrica guardada correctamente" });
    }
  };

  const handleSaveGas = async () => {
    const { error } = await supabase
      .from("tarifas_gas")
      .upsert({
        ...tarifaGas,
        empresa_id: selectedEmpresaId,
      });

    if (error) {
      toast({ title: "Error", description: "Error al guardar tarifa de gas", variant: "destructive" });
    } else {
      toast({ title: "Guardado", description: "Tarifa de gas guardada correctamente" });
    }
  };

  const handleAddServicio = () => {
    setServicios([...servicios, { empresa_id: selectedEmpresaId, nombre: "", precio_mensual: null }]);
  };

  const handleUpdateServicio = (index: number, field: string, value: any) => {
    const updated = [...servicios];
    updated[index] = { ...updated[index], [field]: value };
    setServicios(updated);
  };

  const handleSaveServicio = async (servicio: ServicioAdicional) => {
    const { error } = await supabase
      .from("servicios_adicionales")
      .upsert({ ...servicio, empresa_id: selectedEmpresaId });

    if (error) {
      toast({ title: "Error", description: "Error al guardar servicio", variant: "destructive" });
    } else {
      toast({ title: "Guardado", description: "Servicio guardado correctamente" });
      loadTariffs(selectedEmpresaId);
    }
  };

  const handleDeleteServicio = async (id: string | undefined) => {
    if (!id) return;

    const { error } = await supabase
      .from("servicios_adicionales")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Error al eliminar servicio", variant: "destructive" });
    } else {
      toast({ title: "Eliminado", description: "Servicio eliminado correctamente" });
      loadTariffs(selectedEmpresaId);
    }
  };

  if (roleLoading) return null;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#003942] to-[#002F36] px-4 py-8">
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-4 flex items-center gap-2 text-white transition-colors z-10"
      >
        <ArrowLeft className="h-6 w-6" />
        <span className="text-lg font-medium">Atrás</span>
      </button>

      <div className="max-w-4xl mx-auto space-y-8 pt-16">
        <h1 className="text-3xl font-bold text-white text-center">Administración de Tarifas</h1>

        {/* Company Selector */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Seleccionar Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
              <SelectTrigger className="bg-[#00404A] text-white border-white/20">
                <SelectValue placeholder="Selecciona una empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedEmpresa && (
              <div className="space-y-4 pt-4 border-t border-white/20">
                <h3 className="text-white font-semibold">Editar Empresa</h3>
                
                <div>
                  <Label className="text-white">Nombre</Label>
                  <Input
                    value={selectedEmpresa.nombre}
                    onChange={(e) => setSelectedEmpresa({ ...selectedEmpresa, nombre: e.target.value })}
                    className="bg-[#00404A] text-white border-white/20"
                  />
                </div>

                <div>
                  <Label className="text-white">Color Primario</Label>
                  <Input
                    type="color"
                    value={selectedEmpresa.color_primario}
                    onChange={(e) => setSelectedEmpresa({ ...selectedEmpresa, color_primario: e.target.value })}
                    className="bg-[#00404A] text-white border-white/20 h-12"
                  />
                </div>

                <div>
                  <Label className="text-white">Logo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    className="bg-[#00404A] text-white border-white/20"
                  />
                </div>

                <Button
                  onClick={handleSaveEmpresa}
                  className="bg-[#0A8754] hover:bg-[#0A8754]/90 text-white w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Empresa
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedEmpresaId && (
          <>
            {/* Electricity Tariffs */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Tarifas de Electricidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Potencia P1 (€/kW día)</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      value={tarifaElectricidad.potencia_p1 || ""}
                      onChange={(e) => setTarifaElectricidad({ ...tarifaElectricidad, potencia_p1: parseFloat(e.target.value) || null })}
                      className="bg-[#00404A] text-white border-white/20"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Potencia P2 (€/kW día)</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      value={tarifaElectricidad.potencia_p2 || ""}
                      onChange={(e) => setTarifaElectricidad({ ...tarifaElectricidad, potencia_p2: parseFloat(e.target.value) || null })}
                      className="bg-[#00404A] text-white border-white/20"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Energía P1 (€/kWh)</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      value={tarifaElectricidad.energia_p1 || ""}
                      onChange={(e) => setTarifaElectricidad({ ...tarifaElectricidad, energia_p1: parseFloat(e.target.value) || null })}
                      className="bg-[#00404A] text-white border-white/20"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Energía P2 (€/kWh)</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      value={tarifaElectricidad.energia_p2 || ""}
                      onChange={(e) => setTarifaElectricidad({ ...tarifaElectricidad, energia_p2: parseFloat(e.target.value) || null })}
                      className="bg-[#00404A] text-white border-white/20"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Energía P3 (€/kWh)</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      value={tarifaElectricidad.energia_p3 || ""}
                      onChange={(e) => setTarifaElectricidad({ ...tarifaElectricidad, energia_p3: parseFloat(e.target.value) || null })}
                      className="bg-[#00404A] text-white border-white/20"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Impuesto Eléctrico (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tarifaElectricidad.impuesto_electrico || ""}
                      onChange={(e) => setTarifaElectricidad({ ...tarifaElectricidad, impuesto_electrico: parseFloat(e.target.value) || null })}
                      className="bg-[#00404A] text-white border-white/20"
                    />
                  </div>
                  <div>
                    <Label className="text-white">IVA (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tarifaElectricidad.iva || ""}
                      onChange={(e) => setTarifaElectricidad({ ...tarifaElectricidad, iva: parseFloat(e.target.value) || null })}
                      className="bg-[#00404A] text-white border-white/20"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveElectricidad}
                  className="bg-[#0A8754] hover:bg-[#0A8754]/90 text-white w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Tarifa Eléctrica
                </Button>
              </CardContent>
            </Card>

            {/* Gas Tariffs */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Tarifas de Gas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Término Fijo (€/mes)</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      value={tarifaGas.termino_fijo || ""}
                      onChange={(e) => setTarifaGas({ ...tarifaGas, termino_fijo: parseFloat(e.target.value) || null })}
                      className="bg-[#00404A] text-white border-white/20"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Término Variable (€/kWh)</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      value={tarifaGas.termino_variable || ""}
                      onChange={(e) => setTarifaGas({ ...tarifaGas, termino_variable: parseFloat(e.target.value) || null })}
                      className="bg-[#00404A] text-white border-white/20"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Tarifa ATR</Label>
                    <Select value={tarifaGas.tarifa_atr || ""} onValueChange={(value) => setTarifaGas({ ...tarifaGas, tarifa_atr: value })}>
                      <SelectTrigger className="bg-[#00404A] text-white border-white/20">
                        <SelectValue placeholder="Selecciona tarifa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RL.1">RL.1</SelectItem>
                        <SelectItem value="RL.2">RL.2</SelectItem>
                        <SelectItem value="RL.3">RL.3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white">IVA Gas (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tarifaGas.iva || ""}
                      onChange={(e) => setTarifaGas({ ...tarifaGas, iva: parseFloat(e.target.value) || null })}
                      className="bg-[#00404A] text-white border-white/20"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveGas}
                  className="bg-[#0A8754] hover:bg-[#0A8754]/90 text-white w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Tarifa Gas
                </Button>
              </CardContent>
            </Card>

            {/* Additional Services */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex justify-between items-center">
                  Servicios Adicionales
                  <Button
                    onClick={handleAddServicio}
                    size="sm"
                    className="bg-[#0A8754] hover:bg-[#0A8754]/90 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {servicios.map((servicio, index) => (
                  <div key={servicio.id || index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-white">Nombre del Servicio</Label>
                      <Input
                        value={servicio.nombre}
                        onChange={(e) => handleUpdateServicio(index, "nombre", e.target.value)}
                        className="bg-[#00404A] text-white border-white/20"
                      />
                    </div>
                    <div className="w-40">
                      <Label className="text-white">Precio Mensual (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={servicio.precio_mensual || ""}
                        onChange={(e) => handleUpdateServicio(index, "precio_mensual", parseFloat(e.target.value) || null)}
                        className="bg-[#00404A] text-white border-white/20"
                      />
                    </div>
                    <Button
                      onClick={() => handleSaveServicio(servicio)}
                      size="icon"
                      className="bg-[#0A8754] hover:bg-[#0A8754]/90 text-white"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    {servicio.id && (
                      <Button
                        onClick={() => handleDeleteServicio(servicio.id)}
                        size="icon"
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {servicios.length === 0 && (
                  <p className="text-white/60 text-center py-4">No hay servicios adicionales</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminTariffs;
