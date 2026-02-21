<img
  src="/logo.png"
  alt="ToolsLabs"
  style={{ height: 44, width: "auto", display: "block", margin: "0 auto 16px" }}
/>import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Camera, Settings, Menu, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranding } from "@/contexts/BrandingContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import ManualInvoiceForm from "@/components/ManualInvoiceForm";
import WebcamCaptureModal from "@/components/WebcamCaptureModal";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin, isCompanyAdmin } = useUserRole();
  const { branding, companyBranding } = useBranding();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userApproved, setUserApproved] = useState<boolean | null>(null);
  const [compareCompany, setCompareCompany] = useState<string>("");
  const [tariffType, setTariffType] = useState<"electricity" | "gas" | "manual">("electricity");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Detect if running on Windows desktop
  const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes("Windows");

  const companies = [
    "Endesa",
    "Repsol",
    "Iberdrola",
    "Naturgy",
    "TotalEnergies",
    "Lucera",
    "Holaluz",
    "Orange",
  ];

  useEffect(() => {
    const checkUserApproval = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("approved")
          .eq("user_id", user.id)
          .single();
        
        setUserApproved(profile?.approved || false);
        
        if (profile && !profile.approved) {
          navigate("/pending-approval");
        }
      } else {
        setUserApproved(null);
      }
    };

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      await checkUserApproval();
      setLoading(false);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        // Defer Supabase calls to prevent deadlock
        setTimeout(() => {
          checkUserApproval();
        }, 0);
      } else {
        setUserApproved(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt dialog
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to the install prompt: ${outcome}`);

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleInstallDismiss = () => {
    setShowInstallPrompt(false);
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Check if user is authenticated before processing
    if (!isAuthenticated) {
      toast({
        title: "Autenticación requerida",
        description: "Debes iniciar sesión para subir facturas",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|heic)$/i)) {
      toast({
        title: "Archivo no válido",
        description: "Solo se permiten archivos PDF o imágenes (JPG, PNG)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB for camera photos, 15MB for PDFs)
    const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Archivo muy grande",
        description: file.type.startsWith('image/') 
          ? "La foto no debe superar los 10MB" 
          : "El archivo no debe superar los 15MB",
        variant: "destructive",
      });
      return;
    }

    // ALWAYS compress images for Android memory optimization
    let processedFile = file;
    if (file.type.startsWith('image/')) {
      try {
        console.log('Original image size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
        processedFile = await compressImage(file);
        console.log('Compressed image size:', (processedFile.size / 1024 / 1024).toFixed(2), 'MB');
      } catch (error) {
        console.error('Error compressing image:', error);
        toast({
          title: "Error al comprimir imagen",
          description: "No se pudo optimizar la imagen. Intenta con otra foto.",
          variant: "destructive",
        });
        return;
      }
    }

    // Navigate to processing with the file
    // Use active company from branding as currentCompany
    // Save selected company to localStorage for persistence (PWA on Android)
    localStorage.setItem('selectedCompany', compareCompany);
    localStorage.setItem('tariffType', tariffType);
    
    console.log('Saving to localStorage:', { selectedCompany: compareCompany, tariffType });
    
    navigate('/processing', { state: { file: processedFile, selectedCompany: compareCompany, tariffType } });
  };

  // Helper function to compress images aggressively for mobile
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize to smaller size for mobile memory optimization (max 1280px)
          const maxSize = 1280;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            0.70 // Lower quality for better memory usage (70%)
          );
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  const handlePdfClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    if (isWindows) {
      // On Windows, open webcam modal
      setShowWebcamModal(true);
    } else {
      // On mobile, use native camera input
      cameraInputRef.current?.click();
    }
  };

  const handleWebcamCapture = (file: File) => {
    handleFileSelect(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#003942] to-[#002F36]">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 relative" style={{ 
      background: companyBranding?.background_color 
        ? `linear-gradient(to bottom, ${companyBranding.background_color}, ${companyBranding.background_color})`
        : 'linear-gradient(to bottom, #003942, #002F36)'
    }}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />

      {/* Top navigation - Desktop: visible buttons, Mobile: hamburger menu */}
      <div 
        className="absolute right-4 flex items-center gap-4 z-10"
        style={{
          top: 'max(env(safe-area-inset-top, 0px) + 1.5rem, 1.5rem)'
        }}
      >
        {/* Desktop Navigation - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-4">
          {!isAuthenticated ? (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-sm font-medium transition-colors backdrop-blur-sm bg-black/20 rounded-lg hover:bg-black/30"
                style={{
                  color: companyBranding?.text_color || '#FFFFFF'
                }}
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 text-sm font-medium transition-colors backdrop-blur-sm bg-black/20 rounded-lg hover:bg-black/30"
                style={{
                  color: companyBranding?.text_color || '#FFFFFF'
                }}
              >
                Registrarse
              </button>
            </>
          ) : (
            <>
              {isSuperAdmin && (
                <>
                  <button
                    onClick={() => navigate('/settings')}
                    className="transition-colors backdrop-blur-sm bg-black/20 rounded-lg p-2 hover:bg-black/30"
                    style={{
                      color: companyBranding?.text_color || '#FFFFFF'
                    }}
                  >
                    <Settings className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => navigate('/admin/users')}
                    className="px-3 py-1.5 text-sm font-medium transition-colors backdrop-blur-sm bg-black/20 rounded-lg hover:bg-black/30"
                    style={{
                      color: companyBranding?.text_color || '#FFFFFF'
                    }}
                  >
                    Gestión de usuarios
                  </button>
                </>
              )}
              <button
                onClick={() => navigate('/admin/tariffs')}
                className="px-3 py-1.5 text-sm font-medium transition-colors backdrop-blur-sm bg-black/20 rounded-lg hover:bg-black/30"
                style={{
                  color: companyBranding?.text_color || '#FFFFFF'
                }}
              >
                Edición de tarifas
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/');
                }}
                className="px-3 py-1.5 text-sm font-medium transition-colors backdrop-blur-sm bg-black/20 rounded-lg hover:bg-black/30"
                style={{
                  color: companyBranding?.text_color || '#FFFFFF'
                }}
              >
                Cerrar sesión
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Menu - Visible only on mobile */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button
              className="md:hidden backdrop-blur-sm bg-black/20 rounded-lg p-2 hover:bg-black/30 transition-colors"
              style={{
                color: companyBranding?.text_color || '#FFFFFF'
              }}
            >
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent 
            side="right" 
            className="w-[280px] sm:w-[350px]"
            style={{ 
              background: companyBranding?.background_color || '#003942',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <SheetHeader>
              <SheetTitle 
                className="text-left"
                style={{ color: companyBranding?.text_color || '#FFFFFF' }}
              >
                Menú
              </SheetTitle>
            </SheetHeader>
            
            <div className="flex flex-col gap-4 mt-8">
              {!isAuthenticated ? (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/login');
                    }}
                    className="w-full px-4 py-3 text-left text-base font-medium transition-colors rounded-lg backdrop-blur-sm bg-white/10 hover:bg-white/20"
                    style={{
                      color: companyBranding?.text_color || '#FFFFFF'
                    }}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/register');
                    }}
                    className="w-full px-4 py-3 text-left text-base font-medium transition-colors rounded-lg backdrop-blur-sm bg-white/10 hover:bg-white/20"
                    style={{
                      color: companyBranding?.text_color || '#FFFFFF'
                    }}
                  >
                    Registrarse
                  </button>
                </>
              ) : (
                <>
                  {isSuperAdmin && (
                    <>
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate('/settings');
                        }}
                        className="w-full px-4 py-3 text-left text-base font-medium transition-colors rounded-lg backdrop-blur-sm bg-white/10 hover:bg-white/20 flex items-center gap-3"
                        style={{
                          color: companyBranding?.text_color || '#FFFFFF'
                        }}
                      >
                        <Settings className="h-5 w-5" />
                        Configuración
                      </button>
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate('/admin/users');
                        }}
                        className="w-full px-4 py-3 text-left text-base font-medium transition-colors rounded-lg backdrop-blur-sm bg-white/10 hover:bg-white/20"
                        style={{
                          color: companyBranding?.text_color || '#FFFFFF'
                        }}
                      >
                        Gestión de usuarios
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/admin/tariffs');
                    }}
                    className="w-full px-4 py-3 text-left text-base font-medium transition-colors rounded-lg backdrop-blur-sm bg-white/10 hover:bg-white/20"
                    style={{
                      color: companyBranding?.text_color || '#FFFFFF'
                    }}
                  >
                    Edición de tarifas
                  </button>
                  <button
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await supabase.auth.signOut();
                      navigate('/');
                    }}
                    className="w-full px-4 py-3 text-left text-base font-medium transition-colors rounded-lg backdrop-blur-sm bg-white/10 hover:bg-white/20"
                    style={{
                      color: companyBranding?.text_color || '#FFFFFF'
                    }}
                  >
                    Cerrar sesión
                  </button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center" style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px) + 4rem, 4rem)'
      }}>
        <div className="max-w-md w-full space-y-8 text-center">
          {/* Logo centrado arriba - más espacio superior en móviles con notch */}
          {(companyBranding?.logo_url || branding?.logo_url) && (
            <div className="flex justify-center mb-8 mt-4">
              <img 
                src={companyBranding?.logo_url || branding?.logo_url || ""} 
                alt={companyBranding?.company_name || branding?.app_name || "Logo"} 
                className="w-40 h-auto object-contain"
              />
            </div>
          )}

          {/* Compare with selector */}
          <div className="space-y-4 mb-8">
            <div className="space-y-2">
              <label className="text-sm font-medium block text-left" style={{
                color: companyBranding?.text_color || '#FFFFFF'
              }}>
                Comparar con
              </label>
              <Select value={compareCompany} onValueChange={setCompareCompany}>
                <SelectTrigger className="w-full h-14 bg-[#00404A] text-white border-none rounded-2xl shadow-lg text-lg">
                  <SelectValue placeholder="Selecciona empresa a comparar" />
                </SelectTrigger>
                <SelectContent className="bg-[#00404A] border-none rounded-2xl">
                  {companies.map((company) => (
                    <SelectItem
                      key={company}
                      value={company}
                      className="text-white text-lg focus:bg-[#003942] focus:text-white"
                    >
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tariff Type Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium block text-left" style={{
                color: companyBranding?.text_color || '#FFFFFF'
              }}>
                Tipo de tarifa
              </label>
              <Select 
                value={tariffType} 
                onValueChange={(value: "electricity" | "gas" | "manual") => {
                  setTariffType(value);
                  if (value === "manual") {
                    setShowManualForm(true);
                  }
                }}
              >
                <SelectTrigger className="w-full h-14 bg-[#00404A] text-white border-none rounded-2xl shadow-lg text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#00404A] border-none rounded-2xl">
                  <SelectItem
                    value="electricity"
                    className="text-white text-lg focus:bg-[#003942] focus:text-white"
                  >
                    Electricidad
                  </SelectItem>
                  <SelectItem
                    value="gas"
                    className="text-white text-lg focus:bg-[#003942] focus:text-white"
                  >
                    Gas
                  </SelectItem>
                  <SelectItem
                    value="manual"
                    className="text-white text-lg focus:bg-[#003942] focus:text-white"
                  >
                    Ingresar valores manualmente
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              size="lg"
              onClick={handlePdfClick}
              style={{ backgroundColor: 'var(--brand-primary)' }}
              className="w-full h-16 text-xl rounded-2xl text-white shadow-lg hover:opacity-90"
            >
              <Upload className="mr-3 h-6 w-6" />
              Seleccionar PDF
            </Button>

            <Button
              size="lg"
              onClick={handleCameraClick}
              style={{ backgroundColor: 'var(--brand-secondary)' }}
              className="w-full h-16 text-xl rounded-2xl text-gray-900 shadow-lg hover:opacity-90"
            >
              <Camera className="mr-3 h-6 w-6" />
              Tomar foto
            </Button>
          </div>

          <p className="text-lg mt-8" style={{
            color: companyBranding?.text_color ? `${companyBranding.text_color}CC` : 'rgba(255, 255, 255, 0.8)'
          }}>
            Comparación rápida entre empresas de España
          </p>

          {/* Install App Link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/install')}
              className="text-sm font-medium underline hover:no-underline transition-all"
              style={{
                color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)'
              }}
            >
              📱 ¿Cómo instalar la app en mi teléfono?
            </button>
          </div>

          <div className="mt-12 pt-8">
            <div className="flex flex-wrap justify-center items-center gap-6 opacity-70">
              {companies.map((company) => (
                <div key={company} className="text-sm font-semibold" style={{
                  color: companyBranding?.text_color || '#FFFFFF'
                }}>
                  {company}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* PWA Install Prompt Dialog */}
      <Dialog open={showInstallPrompt} onOpenChange={setShowInstallPrompt}>
        <DialogContent 
          className="sm:max-w-md"
          style={{ 
            background: companyBranding?.background_color || '#003942',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <DialogHeader>
            <DialogTitle 
              className="text-xl font-bold"
              style={{ color: companyBranding?.text_color || '#FFFFFF' }}
            >
              Instalar aplicación
            </DialogTitle>
            <DialogDescription 
              className="text-base"
              style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}CC` : 'rgba(255, 255, 255, 0.8)' }}
            >
              Instala esta app en tu dispositivo para un acceso más rápido y una mejor experiencia
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleInstallDismiss}
              className="w-full sm:w-auto"
              style={{
                borderColor: companyBranding?.text_color ? `${companyBranding.text_color}40` : 'rgba(255, 255, 255, 0.25)',
                color: companyBranding?.text_color || '#FFFFFF'
              }}
            >
              Ahora no
            </Button>
            <Button
              onClick={handleInstallClick}
              className="w-full sm:w-auto"
              style={{ 
                backgroundColor: companyBranding?.primary_color || '#0A8754',
                color: '#FFFFFF'
              }}
            >
              Instalar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Invoice Form Dialog */}
      <Dialog 
        open={showManualForm} 
        onOpenChange={(open) => {
          setShowManualForm(open);
          if (!open) {
            setTariffType("electricity"); // Reset to electricity when closing
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Ingresar valores de factura
            </DialogTitle>
            <DialogDescription>
              Introduce los datos de tu factura eléctrica para compararla con {compareCompany || "la empresa seleccionada"}
            </DialogDescription>
          </DialogHeader>
          <ManualInvoiceForm
            compareCompany={compareCompany}
            isAuthenticated={isAuthenticated}
            onClose={() => {
              setShowManualForm(false);
              setTariffType("electricity");
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Webcam Capture Modal for Windows */}
      <WebcamCaptureModal
        open={showWebcamModal}
        onClose={() => setShowWebcamModal(false)}
        onCapture={handleWebcamCapture}
      />
    </div>
  );
};

export default Index;
