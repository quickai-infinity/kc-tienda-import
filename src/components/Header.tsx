import { useBranding } from "@/contexts/BrandingContext";

const Header = () => {
  const { branding } = useBranding();

  return (
    <header className="w-full flex flex-col items-center justify-center mt-6 mb-4">
      {/* Logo centrado */}
      {branding?.logo_url && (
        <img
          src={branding.logo_url}
          alt="Logo empresa"
          className="w-28 h-auto mb-4 object-contain"
        />
      )}

      {/* Título global (si aplica en esa página) */}
      {/* Este componente SOLO pinta el logo. 
          El título lo escribes directamente en cada página */}
    </header>
  );
};

export default Header;
