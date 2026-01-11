import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Sparkles, Video, Wand2, Upload } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl">StoryFlow</span>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <Link href="/">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <Button onClick={() => window.location.href = "/api/login"}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary mb-6">
              AI-Powered Video Storytelling
            </span>
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-8 max-w-4xl">
              Turn your scattered media into <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">cinema.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Upload your photos and videos. Let our AI analyze, sequence, and narrate them into a cohesive story you'll want to share.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="h-12 px-8 text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                onClick={() => window.location.href = user ? "/" : "/api/login"}
              >
                Start Creating <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </motion.div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-32 w-full max-w-5xl">
            {[
              {
                icon: Upload,
                title: "Smart Upload",
                desc: "Bulk upload your raw footage. We handle formatting and organization automatically."
              },
              {
                icon: Wand2,
                title: "AI Analysis",
                desc: "Our AI sees what's in your videos—people, places, emotions—and tags them instantly."
              },
              {
                icon: Video,
                title: "Auto-Sequencing",
                desc: "Get a first draft timeline generated for you based on narrative arcs, not just timestamps."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl bg-card/40 border border-white/5 hover:border-white/10 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-12 bg-black/20">
        <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} StoryFlow. Crafted with precision.</p>
        </div>
      </footer>
    </div>
  );
}
