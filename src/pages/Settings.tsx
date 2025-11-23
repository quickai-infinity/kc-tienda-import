import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

const Settings = () => {
  const navigate = useNavigate();
  const [appName, setAppName] = useState("Compare Energia");
  const [showOnlyMyCompany, setShowOnlyMyCompany] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#0A8754");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#003942] to-[#002F36] relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-4 flex items-center gap-2 text-white hover:text-white/80 transition-colors z-10"
      >
        <ArrowLeft className="h-6 w-6" />
        <span className="text-lg font-medium">Atrás</span>
      </button>

      {/* Main Content */}
      <div className="flex-1 px-4 py-20">
        <div className="max-w-md mx-auto space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-8">
            White Label Settings
          </h1>

          {/* App Name */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="space-y-2">
              <Label htmlFor="appName" className="text-white text-sm font-medium">
                Nombre de la app
              </Label>
              <Input
                id="appName"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="bg-[#00404A] text-white border-none rounded-xl h-12"
              />
            </div>
          </div>

          {/* Primary Color */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="space-y-2">
              <Label htmlFor="primaryColor" className="text-white text-sm font-medium">
                Color principal
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-12 w-20 rounded-xl cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="bg-[#00404A] text-white border-none rounded-xl h-12 flex-1"
                />
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4 shadow-lg">
            <Label className="text-white text-sm font-medium">
              Logo de la empresa
            </Label>
            <Button
              variant="outline"
              className="w-full h-12 bg-[#00404A] text-white border-none rounded-xl hover:bg-[#003942]"
            >
              <Upload className="mr-2 h-5 w-5" />
              Subir logo
            </Button>
          </div>

          {/* Toggle: Show Only My Company */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="showOnlyCompany" className="text-white font-medium">
                  Mostrar solo mi empresa
                </Label>
                <p className="text-white/60 text-sm">
                  Ocultar otras compañías en comparaciones
                </p>
              </div>
              <Switch
                id="showOnlyCompany"
                checked={showOnlyMyCompany}
                onCheckedChange={setShowOnlyMyCompany}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Settings;
