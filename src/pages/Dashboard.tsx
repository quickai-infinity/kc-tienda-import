import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

interface ClientCard {
  id: string;
  name: string;
  savings: string;
}

const Dashboard = () => {
  const navigate = useNavigate();

  const clients: ClientCard[] = [
    { id: "1", name: "Ana Pérez", savings: "189 €/año" },
    { id: "2", name: "Juan L.", savings: "57 €/año" },
    { id: "3", name: "Marta G.", savings: "204 €/año" },
  ];

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

      {/* Export PDF Button */}
      <div className="absolute top-6 right-4 z-10">
        <Button
          variant="outline"
          className="bg-white/10 text-white border-white/20 hover:bg-white/20"
        >
          <FileText className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-20">
        <div className="max-w-md mx-auto space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-8">
            Clientes atendidos
          </h1>

          <div className="space-y-4">
            {clients.map((client) => (
              <div
                key={client.id}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex items-center justify-between hover:bg-white/15 transition-all shadow-lg"
              >
                <span className="text-lg font-semibold text-white">
                  {client.name}
                </span>
                <span className="text-xl font-bold text-[#0A8754]">
                  {client.savings}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
