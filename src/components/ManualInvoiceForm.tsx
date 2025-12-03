import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ManualInvoiceFormProps {
  compareCompany: string;
  isAuthenticated: boolean;
  onClose: () => void;
}

const ManualInvoiceForm = ({ compareCompany, isAuthenticated, onClose }: ManualInvoiceFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    // Datos generales
    empresa: "",
    tarifa: "",
    cups: "",
    potencia_days: "30",
    // Potencia
    potencia_kw: "",
    potencia_price: "",
    potencia_p2_price: "",
    potencia_p3_price: "",
    // Energía
    consumo_p1: "",
    consumo_p2: "",
    consumo_p3: "",
    energia_p1_price: "",
    energia_p2_price: "",
    energia_p3_price: "",
    // Impuestos
    impuesto_electrico: "5.1127",
    iva: "21",
  });

  const parseDecimal = (value: string): number => {
    if (!value || value.trim() === "") return 0;
    const normalized = value.replace(",", ".");
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleInputChange = (field: string, value: string) => {
    // Allow only numbers, comma and period
    if (field !== "empresa" && field !== "tarifa" && field !== "cups") {
      const sanitized = value.replace(/[^0-9.,]/g, "");
      setFormData(prev => ({ ...prev, [field]: sanitized }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = () => {
    // Check authentication
    if (!isAuthenticated) {
      toast({
        title: "Autenticación requerida",
        description: "Debes iniciar sesión para usar esta función",
        variant: "destructive",
      });
      return;
    }

    // Validate company selection
    if (!compareCompany) {
      toast({
        title: "Selecciona una empresa",
        description: "Debes seleccionar una empresa para comparar",
        variant: "destructive",
      });
      return;
    }

    // Build extractedData object matching OCR structure
    const consumoP1 = parseDecimal(formData.consumo_p1);
    const consumoP2 = parseDecimal(formData.consumo_p2);
    const consumoP3 = parseDecimal(formData.consumo_p3);

    const extractedData = {
      empresa: formData.empresa || "Factura manual",
      tarifa: formData.tarifa || null,
      cups: formData.cups || null,
      potencia_days: parseDecimal(formData.potencia_days),
      potencia_kw: parseDecimal(formData.potencia_kw),
      potencia_price: parseDecimal(formData.potencia_price),
      potencia_p2_price: parseDecimal(formData.potencia_p2_price) || null,
      potencia_p3_price: parseDecimal(formData.potencia_p3_price) || null,
      consumo_p1: consumoP1,
      consumo_p2: consumoP2 || null,
      consumo_p3: consumoP3 || null,
      energia_p1_price: parseDecimal(formData.energia_p1_price),
      energia_p2_price: parseDecimal(formData.energia_p2_price) || null,
      energia_p3_price: parseDecimal(formData.energia_p3_price) || null,
      impuesto_electrico: parseDecimal(formData.impuesto_electrico),
      iva: parseDecimal(formData.iva),
      consumo_kwh: consumoP1 + consumoP2 + consumoP3,
      precio_mensual: null,
      termino_potencia_euros: null,
    };

    // Save to localStorage for PWA persistence
    localStorage.setItem("selectedCompany", compareCompany);
    localStorage.setItem("tariffType", "electricity");

    // Navigate directly to /results (skip Processing)
    navigate("/results", {
      state: {
        extractedData,
        currentCompany: compareCompany,
        tariffType: "electricity",
        detectedFields: ["manual"],
        fallbacksApplied: [],
        isManualEntry: true,
      },
    });

    onClose();
  };

  return (
    <div className="space-y-6 py-4">
      {/* Datos generales */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Datos generales
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="empresa">Empresa de la factura</Label>
            <Input
              id="empresa"
              value={formData.empresa}
              onChange={(e) => handleInputChange("empresa", e.target.value)}
              placeholder="Ej: Endesa"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tarifa">Tarifa actual</Label>
            <Input
              id="tarifa"
              value={formData.tarifa}
              onChange={(e) => handleInputChange("tarifa", e.target.value)}
              placeholder="Ej: 2.0TD"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cups">CUPS</Label>
            <Input
              id="cups"
              value={formData.cups}
              onChange={(e) => handleInputChange("cups", e.target.value)}
              placeholder="ES0021..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="potencia_days">Días del periodo</Label>
            <Input
              id="potencia_days"
              value={formData.potencia_days}
              onChange={(e) => handleInputChange("potencia_days", e.target.value)}
              placeholder="30"
            />
          </div>
        </div>
      </div>

      {/* Potencia */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Potencia
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="potencia_kw">Potencia contratada (kW)</Label>
            <Input
              id="potencia_kw"
              value={formData.potencia_kw}
              onChange={(e) => handleInputChange("potencia_kw", e.target.value)}
              placeholder="4,6"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="potencia_price">Precio potencia P1 (€/kW/día)</Label>
            <Input
              id="potencia_price"
              value={formData.potencia_price}
              onChange={(e) => handleInputChange("potencia_price", e.target.value)}
              placeholder="0,082"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="potencia_p2_price">Precio potencia P2 (€/kW/día)</Label>
            <Input
              id="potencia_p2_price"
              value={formData.potencia_p2_price}
              onChange={(e) => handleInputChange("potencia_p2_price", e.target.value)}
              placeholder="0,015"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="potencia_p3_price">Precio potencia P3 (€/kW/día)</Label>
            <Input
              id="potencia_p3_price"
              value={formData.potencia_p3_price}
              onChange={(e) => handleInputChange("potencia_p3_price", e.target.value)}
              placeholder="0,003"
            />
          </div>
        </div>
      </div>

      {/* Energía */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Energía
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="consumo_p1">Consumo P1 (kWh)</Label>
            <Input
              id="consumo_p1"
              value={formData.consumo_p1}
              onChange={(e) => handleInputChange("consumo_p1", e.target.value)}
              placeholder="150"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="consumo_p2">Consumo P2 (kWh)</Label>
            <Input
              id="consumo_p2"
              value={formData.consumo_p2}
              onChange={(e) => handleInputChange("consumo_p2", e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="consumo_p3">Consumo P3 (kWh)</Label>
            <Input
              id="consumo_p3"
              value={formData.consumo_p3}
              onChange={(e) => handleInputChange("consumo_p3", e.target.value)}
              placeholder="50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="energia_p1_price">Precio energía P1 (€/kWh)</Label>
            <Input
              id="energia_p1_price"
              value={formData.energia_p1_price}
              onChange={(e) => handleInputChange("energia_p1_price", e.target.value)}
              placeholder="0,18"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="energia_p2_price">Precio energía P2 (€/kWh)</Label>
            <Input
              id="energia_p2_price"
              value={formData.energia_p2_price}
              onChange={(e) => handleInputChange("energia_p2_price", e.target.value)}
              placeholder="0,12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="energia_p3_price">Precio energía P3 (€/kWh)</Label>
            <Input
              id="energia_p3_price"
              value={formData.energia_p3_price}
              onChange={(e) => handleInputChange("energia_p3_price", e.target.value)}
              placeholder="0,08"
            />
          </div>
        </div>
      </div>

      {/* Impuestos */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Impuestos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="impuesto_electrico">Impuesto eléctrico (%)</Label>
            <Input
              id="impuesto_electrico"
              value={formData.impuesto_electrico}
              onChange={(e) => handleInputChange("impuesto_electrico", e.target.value)}
              placeholder="5.1127"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iva">IVA (%)</Label>
            <Input
              id="iva"
              value={formData.iva}
              onChange={(e) => handleInputChange("iva", e.target.value)}
              placeholder="21"
            />
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="pt-4">
        <Button
          onClick={handleSubmit}
          className="w-full h-14 text-lg rounded-xl"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          Usar estos valores para comparar
        </Button>
        {!isAuthenticated && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            Debes iniciar sesión para usar esta función
          </p>
        )}
      </div>
    </div>
  );
};

export default ManualInvoiceForm;
