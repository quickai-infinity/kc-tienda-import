import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";

interface ProcessingItem {
  id: string;
  label: string;
  completed: boolean;
}

const Processing = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProcessingItem[]>([
    { id: "consumo", label: "Consumo mensual", completed: false },
    { id: "tarifa", label: "Tarifa actual", completed: false },
    { id: "cups", label: "CUPS", completed: false },
  ]);

  // Simulate processing animation (for demo purposes)
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    // Complete items one by one with delays
    items.forEach((item, index) => {
      const timer = setTimeout(() => {
        setItems(prev => 
          prev.map((i, idx) => 
            idx === index ? { ...i, completed: true } : i
          )
        );
      }, (index + 1) * 2000); // 2s, 4s, 6s
      
      timers.push(timer);
    });

    // Navigate to results after all items are completed
    const finalTimer = setTimeout(() => {
      navigate('/results');
    }, 7000); // Navigate after 7 seconds (all items done + small delay)
    
    timers.push(finalTimer);

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#003942] to-[#002F36] px-4">
      <div className="max-w-md w-full space-y-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
          Extrayendo información con IA…
        </h1>

        {/* Loader Animation */}
        <div className="flex justify-center mb-12">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-[#0A8754]/30 rounded-full"></div>
            <div className="absolute top-0 left-0 w-24 h-24 border-4 border-[#0A8754] rounded-full border-t-transparent animate-spin"></div>
          </div>
        </div>

        {/* Processing Items */}
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 flex items-center gap-4 transition-all duration-300"
              style={{
                borderLeft: item.completed ? "4px solid #0A8754" : "4px solid transparent",
              }}
            >
              {item.completed ? (
                <CheckCircle2 className="w-6 h-6 text-[#0A8754] flex-shrink-0" />
              ) : (
                <Circle className="w-6 h-6 text-gray-400 flex-shrink-0" />
              )}
              <span
                className={`text-lg font-medium transition-colors duration-300 ${
                  item.completed ? "text-white" : "text-gray-400"
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <p className="text-white/60 text-sm mt-8">
          Esto puede tardar unos segundos...
        </p>
      </div>
    </div>
  );
};

export default Processing;
