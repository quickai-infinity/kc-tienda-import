import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Cancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-12 text-center">
            <XCircle className="w-20 h-20 text-muted-foreground mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">Pago cancelado</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Has cancelado el proceso de pago. No se ha realizado ningún cargo.
            </p>
            <div className="space-y-3">
              <Button size="lg" onClick={() => navigate('/')} className="w-full sm:w-auto">
                Volver al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Cancel;