import { useBranding } from "@/contexts/BrandingContext";

const Footer = () => {
  const { branding, companyBranding } = useBranding();
  
  return (
    <footer className="py-6 text-center">
      <p className="text-sm" style={{
        color: companyBranding?.text_color ? `${companyBranding.text_color}99` : '#C8C8C8'
      }}>
        © 2025 {branding?.app_name || "KC Informatika"} — Todos los derechos reservados.
      </p>
    </footer>
  );
};

export default Footer;
