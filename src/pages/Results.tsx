import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

interface CompanyOption {
  id: string;
  name: string;
  pricePerMonth: string;
  isBest?: boolean;
}

const Results = () => {
  const navigate = useNavigate();
  const savingsPerMonth = "32,47";
  const savingsPerYear = "389,64";

  const companies: CompanyOption[] = [
    { id: "endesa", name: "Endesa", pricePerMonth: "30" },
    { id: "repsol", name: "Repsol", pricePerMonth: "30", isBest: true },
    { id: "iberdrola", name: "Iberdrola", pricePerMonth: "35" },
    { id: "totalenergies", name: "TotalEnergies", pricePerMonth: "35" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#003942] to-[#002F36] px-4 py-8 relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-4 flex items-center gap-2 text-white hover:text-white/80 transition-colors z-10"
      >
        <ArrowLeft className="h-6 w-6" />
        <span className="text-lg font-medium">Atrás</span>
      </button>

      <div className="flex-1">
      <div className="max-w-md mx-auto space-y-8">
        {/* Savings Header */}
        <div className="text-center space-y-4 pt-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Podrías ahorrar:
          </h1>
          
          <div className="space-y-2">
            <div className="text-5xl md:text-6xl font-bold text-[#0A8754]">
              {savingsPerMonth} €/mes
            </div>
            <div className="text-xl md:text-2xl text-white/80 font-medium">
              {savingsPerYear} €/año
            </div>
          </div>
        </div>

        {/* Company Comparison Cards */}
        <div className="space-y-3 mt-12">
          {companies.map((company) => (
            <div
              key={company.id}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex items-center justify-between transition-all duration-300 hover:bg-white/15 shadow-lg"
              style={{
                borderLeft: company.isBest ? "4px solid #FFC300" : "4px solid transparent",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-white">
                  {company.name}
                </span>
                {company.isBest && (
                  <Badge className="bg-[#FFC300] text-gray-900 hover:bg-[#FFC300]/90 font-medium">
                    Mejor
                  </Badge>
                )}
              </div>
              
              <div className="text-xl font-bold text-white">
                {company.pricePerMonth} €/mes
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center text-white/60 text-sm mt-8">
          Comparación basada en tu consumo actual
        </div>

        {/* Ver Historial Button */}
        <div className="text-center mt-6">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            Ver historial
          </Button>
        </div>
      </div>
      </div>

      <Footer />
    </div>
  );
};

export default Results;
