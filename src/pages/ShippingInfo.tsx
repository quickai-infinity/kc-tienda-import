import { Link } from "react-router-dom";
import { ArrowLeft, Package, Truck, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const ShippingInfo = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-in">
                Shipping Information
              </h1>
              <p className="text-lg text-muted-foreground mb-8 animate-slide-up">
                Fast, reliable delivery for all your orders
              </p>
              <Link to="/">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Shipping Details */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Main Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Package className="h-6 w-6 text-primary" />
                    Our Shipping Policy
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-lg max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    We offer free shipping on all orders over €50. Orders are processed within 24 hours 
                    and shipped via trusted carriers. You will receive tracking information via email 
                    once your order is shipped.
                  </p>
                </CardContent>
              </Card>

              {/* Features Grid */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <Truck className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-lg">Free Shipping</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Enjoy free shipping on all orders over €50 within Spain. Orders under €50 
                      have a flat rate of €4.99.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Clock className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-lg">Fast Processing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Orders are processed within 24 hours on business days. Standard delivery 
                      takes 2-4 business days.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <MapPin className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-lg">Reliable Carriers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      We partner with trusted shipping carriers to ensure your orders arrive 
                      safely and on time.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Tracking Your Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Once your order is shipped, you will receive an email with tracking information. 
                      Use this to monitor your delivery status in real-time.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Delivery Areas</h3>
                    <p className="text-sm text-muted-foreground">
                      We currently ship within Spain. For deliveries to other countries, please 
                      contact our customer support team for assistance.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Need Help?</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      If you have questions about your shipment or need assistance, our support 
                      team is here to help.
                    </p>
                    <Link to="/contact">
                      <Button variant="outline" size="sm">
                        Contact Support
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default ShippingInfo;
