import { useBranding } from "@/contexts/BrandingContext";

const Footer = () => {
  const { branding, companyBranding } = useBranding();
  
  return (
    <footer className="text-center" style={{
      paddingTop: '1.5rem',
      paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 1.5rem), 1.5rem)'
    }}>
      <p className="text-sm" style={{
        color: companyBranding?.text_color ? `${companyBranding.text_color}99` : '#C8C8C8'
      }}>
        © 2025 {branding?.app_name || "KC Informatika"} — Todos los derechos reservados.
      </p>
    </footer>
  );
};

export default Footer;
