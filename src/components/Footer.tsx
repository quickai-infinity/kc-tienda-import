import { useBranding } from "@/contexts/BrandingContext";

const Footer = () => {
  const { branding } = useBranding();
  
  return (
    <footer className="py-6 text-center">
      <p className="text-[#C8C8C8] text-sm">
        © 2025 {branding?.app_name || "KC Informatika"} — Todos los derechos reservados.
      </p>
    </footer>
  );
};

export default Footer;
