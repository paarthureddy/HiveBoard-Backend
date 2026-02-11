import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Sparkles, Share2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import logo from "@/assets/hive-logo.jpg";

/**
 * Landing Page
 * 
 * The public-facing home page of the application.
 * Features:
 * - Hero section with call-to-action buttons.
 * - Feature highlights (Real-time, AI, Sharing).
 * - Navigation to Login or Demo Canvas.
 * - Uses Framer Motion for animations.
 */
const Landing = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(245, 244, 235)' }}>
      {/* Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-[rgb(95,74,139)] backdrop-blur-md"
        style={{ backgroundColor: 'rgba(95, 74, 139, 0.75)' }}
      >
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden border-2 border-black/20">
              <img src={logo} alt="HiveBoard Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-display text-xl font-semibold text-[rgb(255,212,29)]">HiveBoard</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            {!isAuthenticated && (
              <>
                <Button variant="ghost" size="sm" asChild className="text-[rgb(245,244,235)] hover:bg-white/10 hover:text-[rgb(245,244,235)]">
                  <Link to="/canvas">Try Demo</Link>
                </Button>
                <Button variant="elegant" size="sm" asChild className="text-[rgb(245,244,235)] hover:bg-white/10 hover:text-[rgb(245,244,235)]">
                  <Link to="/auth">Sign In</Link>
                </Button>
              </>
            )}
            {isAuthenticated && (
              <Button variant="elegant" size="sm" asChild className="text-[rgb(245,244,235)] hover:bg-white/10 hover:text-[rgb(245,244,235)]">
                <Link to="/home">My Projects</Link>
              </Button>
            )}
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background Image */}
        <div className="absolute inset-0 z-0" style={{ backgroundColor: 'rgb(245, 244, 235)' }}>
          <div className="absolute inset-0 bg-gradient-hero opacity-50" />
        </div>

        {/* Floating Elements */}
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-[15%] w-64 h-64 rounded-full bg-primary/10 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/4 right-[15%] w-80 h-80 rounded-full bg-accent/15 blur-3xl"
        />

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                Real-time Collaborative Design
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight mb-6 text-[rgb(95,74,139)]"
            >
              Design Together,
              <br />
              <span>Create Magic</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg md:text-xl text-[rgb(95,74,139)] max-w-2xl mx-auto mb-10 font-body"
            >
              A fluid, elegant canvas where fashion designers collaborate in real-time.
              Sketch ideas, share inspiration, and create stunning collections together.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button
                variant="hero"
                size="xl"
                asChild
                className="bg-[rgb(245,244,235)] text-[rgb(95,74,139)] border-2 border-[rgb(95,74,139)] hover:bg-[rgb(95,74,139)] hover:text-[rgb(245,244,235)] transition-colors"
              >
                <Link to="/canvas">
                  Start Creating
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                variant="glass"
                size="xl"
                asChild
                className="bg-[rgb(245,244,235)] text-[rgb(95,74,139)] border-2 border-[rgb(95,74,139)] hover:bg-[rgb(95,74,139)] hover:text-[rgb(245,244,235)] transition-colors"
              >
                <Link to="/auth">Join a Session</Link>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
          >
            <div className="w-1 h-2 rounded-full bg-muted-foreground/50" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-gradient-cream">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="font-display text-4xl md:text-5xl font-semibold mb-4">
              Your Studio in the Cloud
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to collaborate on fashion design, beautifully integrated.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Real-time Collaboration",
                description: "See your team's cursors, edits, and ideas appear instantly. Work together as if you're in the same room."
              },
              {
                icon: Sparkles,
                title: "AI-Powered Suggestions",
                description: "Get intelligent design recommendations that understand fashion aesthetics and your creative vision."
              },
              {
                icon: Share2,
                title: "Seamless Sharing",
                description: "Share your canvas with a link. Control who can view, edit, or export your creative work."
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group relative p-8 rounded-2xl bg-white/50 border border-[rgb(95,74,139)] hover:border-[rgb(95,74,139)]/80 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <div className="w-14 h-14 rounded-xl bg-[rgb(95,74,139)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-[rgb(95,74,139)]" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3 text-[rgb(95,74,139)]">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative overflow-hidden rounded-3xl p-12 md:p-20 text-center"
            style={{ background: 'linear-gradient(135deg, rgb(95, 74, 139) 0%, rgb(75, 50, 120) 100%)' }}
          >
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              <h2 className="font-display text-4xl md:text-5xl font-semibold mb-6 text-[rgb(245,244,235)]">
                Ready to Transform Your Creative Process?
              </h2>
              <p className="text-[rgb(245,244,235)] text-lg max-w-xl mx-auto mb-10 opacity-90">
                Join thousands of designers who are already creating together on HiveBoard.
              </p>
              <Button
                variant="hero"
                size="xl"
                className="bg-transparent text-[rgb(245,244,235)] border-2 border-[rgb(245,244,235)] hover:bg-[rgb(245,244,235)] hover:text-[rgb(95,74,139)] transition-colors"
                asChild
              >
                <Link to="/canvas">
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                <img src={logo} alt="HiveBoard Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-display text-lg font-semibold">HiveBoard</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 HiveBoard. Crafted for creative minds.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
