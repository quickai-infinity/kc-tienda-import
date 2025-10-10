import { Link } from "react-router-dom";
import { ArrowLeft, Package, RotateCcw, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-in">
                Frequently Asked Questions
              </h1>
              <p className="text-lg text-muted-foreground mb-8 animate-slide-up">
                Find answers to common questions about our products, shipping, and services.
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

        {/* FAQ Content */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Shipping & Delivery */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Shipping & Delivery
                  </CardTitle>
                  <CardDescription>
                    Information about shipping costs and delivery times
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="shipping-costs">
                      <AccordionTrigger>What are the shipping costs?</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          All orders over €50 include free shipping within Spain. For orders under €50, 
                          a €4.99 shipping fee applies.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="delivery-time">
                      <AccordionTrigger>How long does delivery take?</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          Standard delivery time is 2–4 business days within Spain. Orders are processed 
                          within 24 hours and you will receive tracking information via email once your 
                          order is shipped.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="tracking">
                      <AccordionTrigger>Can I track my order?</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          Yes! Once your order is shipped, you will receive tracking information via email. 
                          You can use this to monitor your delivery status in real-time.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Returns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-primary" />
                    Returns
                  </CardTitle>
                  <CardDescription>
                    Our return policy and procedures
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="return-policy">
                      <AccordionTrigger>What is your return policy?</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          You can return any product within 14 days of receipt. The product must be unused 
                          and in original packaging. We will process your refund within 5-7 business days 
                          after receiving the returned item.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="return-process">
                      <AccordionTrigger>How do I initiate a return?</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          To initiate a return, please contact our customer support team with your order 
                          number and reason for return. We will provide you with a return authorization 
                          and shipping instructions.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="return-shipping">
                      <AccordionTrigger>Who pays for return shipping?</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          Return shipping costs are covered by the customer unless the return is due to 
                          a defective or incorrect product. In such cases, we will provide a prepaid 
                          return label.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Contact Support */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Headphones className="h-5 w-5 text-primary" />
                    Contact Support
                  </CardTitle>
                  <CardDescription>
                    Need more help? We're here for you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Can't find what you're looking for? Our customer support team is ready to help 
                    you with any questions or concerns.
                  </p>
                  <Link to="/contact">
                    <Button className="w-full sm:w-auto">
                      Contact Us
                    </Button>
                  </Link>
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

export default FAQ;
