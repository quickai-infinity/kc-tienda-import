import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const Blog = () => {
  const placeholderPosts = [
    {
      id: 1,
      title: "Top 10 Tech Gadgets of 2025",
      excerpt: "Discover the most innovative gadgets that are changing how we live and work.",
      date: "2025-10-08",
      author: "Tech Team"
    },
    {
      id: 2,
      title: "How to Choose the Perfect Gaming Setup",
      excerpt: "A comprehensive guide to building your dream gaming station on any budget.",
      date: "2025-10-05",
      author: "Gaming Expert"
    },
    {
      id: 3,
      title: "Smart Home Technology Trends",
      excerpt: "Explore the latest innovations making homes smarter and more efficient.",
      date: "2025-10-01",
      author: "Tech Team"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-in">
                Blog & News
              </h1>
              <p className="text-lg text-muted-foreground mb-8 animate-slide-up">
                Stay updated with the latest trends, tips, and insights from the world of technology.
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

        {/* Blog Posts */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid gap-6">
                {placeholderPosts.map((post) => (
                  <Card key={post.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-2xl">{post.title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(post.date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {post.author}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                      <Button variant="link" className="px-0">
                        Read More →
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Blog;
