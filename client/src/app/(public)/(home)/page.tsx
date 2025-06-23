'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { NoteEarlyLogo } from '@/components/NoteEarlyLogo';
import { motion } from 'framer-motion';
import { BookOpen, Users, TrendingUp, Sparkles, Star, ArrowRight, CheckCircle, Menu, X } from 'lucide-react';


const features = [
  {
    icon: BookOpen,
    title: "Reading Modules",
    description: "Levels 1-10 with progressive difficulty for children at different reading stages"
  },
  {
    icon: Users,
    title: "Create Content", 
    description: "Customize your own reading modules with our easy-to-use editor"
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    description: "Monitor reading progress and comprehension improvements over time"
  }
];

const testimonials = [
  {
    name: "Sarah Kim",
    role: "3rd Grade Teacher",
    content: "This is a great initiative to help children learn to understand what they read. The platform is easy to use and I have full control over the content."
  },
  {
    name: "Michael Robson", 
    role: "Homeschool Parent",
    content: "NoteEarly is a great platform that makes my child loves using it. I like how I can create my own content and track their progress."
  },
  {
    name: "Emma Thompson-Nguyen",
    role: "School Principal", 
    content: "Being able to create content where teachers can adapt difficulty levels are great. Each child gets exactly the challenge they need."
  }
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for trying out",
    features: ["1 student", "Basic modules", "Limited features", "Community support"],
    buttonText: "Get Started",
    buttonColor: "bg-primary hover:bg-primary/90 text-primary-foreground",
    href: "/signup",
    mostPopular: false
  },
  {
    name: "Home",
    price: "$7",
    period: "/mo",
    description: "Great for families", 
    features: ["5 students", "All modules", "10 custom modules", "Basic analytics", "Email support"],
    buttonText: "Choose Home",
    buttonColor: "bg-accent hover:bg-accent/80 text-accent-foreground hover:text-accent-foreground/80",
    href: "/signup",
    mostPopular: true
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo", 
    description: "For educators",
    features: ["30 students", "All modules", "30 custom modules", "Advanced analytics", "Priority support"],
    buttonText: "Choose Pro",
    buttonColor: "bg-secondary hover:bg-secondary/90 text-secondary-foreground",
    href: "/signup",
    mostPopular: false
  }
];

// Optimized animated icon component with better dark mode visibility
const AnimatedIcon = ({ icon: Icon, className, delay = 0 }: { icon: any, className?: string, delay?: number }) => (
  <motion.div 
    className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center ${className}`}
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.5, delay: delay }}
    whileHover={{ scale: 1.05 }}
  >
    <Icon className="w-6 h-6 text-popover-foreground" />
  </motion.div>
);

// Reusable motion wrapper for sections
const SectionMotion = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    viewport={{ once: true }}
  >
    {children}
  </motion.div>
);

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */} 
      <header className="sticky top-0 z-50 border-b border-primary/20 bg-primary text-primary-foreground">
        <div className="flex h-14 items-center px-4 sm:px-6 lg:px-8"> 
          <Link href="/">
            <NoteEarlyLogo className="text-primary-foreground hover:text-accent"/>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="ml-6 hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link href="/" className="transition-colors hover:text-accent text-primary-foreground">Home</Link> 
            <Link href="#features" className="transition-colors hover:text-accent text-primary-foreground">Features</Link>
            <Link href="#pricing" className="transition-colors hover:text-accent text-primary-foreground">Pricing</Link>
            <Link href="/blog" className="transition-colors hover:text-accent text-primary-foreground">Blog</Link>
          </nav>

          <div className="flex flex-1 items-center justify-end space-x-2">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto group" asChild>
                <Link href="/signup">Register</Link>
              </Button>
              <ThemeToggle /> 
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-primary-foreground/20 bg-primary">
            <div className="p-4 space-y-3">
              <Link 
                href="/" 
                className="block py-2 text-primary-foreground hover:text-primary-foreground/80 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                href="#features" 
                className="block py-2 text-primary-foreground hover:text-primary-foreground/80 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                href="#pricing" 
                className="block py-2 text-primary-foreground hover:text-primary-foreground/80 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link 
                href="/blog" 
                className="block py-2 text-primary-foreground hover:text-primary-foreground/80 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
              <hr className="border-primary-foreground/20" />
              <div className="flex flex-col space-y-2 pt-2">
                <Button 
                  variant="ghost" 
                  className="justify-start text-primary-foreground hover:bg-primary-foreground/10" 
                  asChild
                >
                  <Link href="/login">Login</Link>
                </Button>
                <Button 
                  className="justify-start bg-accent hover:bg-accent/90 text-accent-foreground" 
                  asChild
                >
                  <Link href="/signup">Register</Link>
                </Button>
                <div className="pt-2">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Enhanced Hero Section with background image */}
        <section className="relative w-full py-16 md:py-24 lg:py-32 bg-background overflow-hidden">
          {/* Background image blended professionally - hidden on mobile */}
          <div className="absolute inset-0 pointer-events-none hidden md:block">
            <div className="absolute right-0 top-0 w-1/2 h-full">
              <Image
                src="/teacher-student.png"
                alt="Illustration of a teacher and student"
                fill
                className="object-cover object-left"
              />
              {/* Professional blend overlay - lighter fade for light mode */}
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent dark:via-background/60" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-background/10 dark:from-background/30 dark:to-background/20" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/20 dark:from-background/20 dark:to-background/30" />
            </div>
          </div>

          {/* Subtle animated background elements */}
          <motion.div
            className="absolute top-1/4 right-1/4 w-32 h-32 bg-primary/5 rounded-full blur-3xl hidden md:block"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <div className="container px-4 md:px-6 grid grid-cols-1 gap-10 lg:gap-16 items-center relative z-10"> 
            <div className="flex justify-center md:justify-start">
              <motion.div 
                className="flex flex-col items-center md:items-start text-center md:text-left space-y-6 max-w-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              > 
                {/* Trust badge */}
                <motion.div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Trusted by 50+ educators</span>
                </motion.div>

                <motion.h1 
                  className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-tight text-foreground"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                > 
                  Not just reading, <br/>understanding begins here.
                </motion.h1>

                <motion.p 
                  className="text-base text-muted-foreground max-w-[600px]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  An educational platform for children ages 5-12 to improve reading comprehension.
                  Build stronger readers by creating your own lessons that adapt to every child's pace.
                </motion.p>

                <motion.div 
                  className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                > 
                  <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto group" asChild>
                    <Link href="/signup">
                      Get Started
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                     <Link href="/login">Login</Link>
                  </Button>
                </motion.div>

                {/* Stats */}
                <motion.div 
                  className="flex items-center gap-6 pt-4 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                >
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">4/5</span>
                    <span className="text-muted-foreground">rating</span>
                  </div>
                  <div className="w-px h-4 bg-border" />
                    <div className="text-muted-foreground">100+ happy students</div>
                  </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Key Features Section */}
        <section id="features" className="w-full py-16 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6"> 
            <SectionMotion>
              <div className="text-center mb-12 lg:mb-16">
                <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">Key Features</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Powerful tools designed to make reading comprehension engaging and effective for every child.
                </p>
              </div>
            </SectionMotion>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12"> 
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                >
                  <Card className=" border border-border/50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"> 
                    <CardHeader className="items-center pt-8 pb-4"> 
                      <AnimatedIcon icon={feature.icon} delay={index * 0.1} />
                    </CardHeader>
                    <CardContent className="text-center px-6 pb-8"> 
                      <CardTitle className="mb-2 text-xl">{feature.title}</CardTitle> 
                      <p className="text-muted-foreground text-sm">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full py-16 md:py-24 bg-background">
          <div className="container px-4 md:px-6">
            <SectionMotion>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4 text-foreground">Loved by Educators</h2>
                <div className="flex justify-center items-center gap-2 mb-8">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1, duration: 0.3 }}
                      viewport={{ once: true }}
                    >
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    </motion.div>
                  ))}
                  <span className="ml-2 text-muted-foreground">4/5 from 20+ reviews</span>
                </div>
              </div>
            </SectionMotion>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -2 }}
                >
                  <Card className="bg-card border border-border/50 p-6 hover:shadow-lg transition-shadow duration-300 min-h-[300px]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold text-sm">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                    <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="w-full py-16 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6"> 
            <SectionMotion>
              <div className="text-center mb-12 lg:mb-16">
                <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">Simple, Transparent Pricing</h2>
                <p className="text-muted-foreground"> 
                  Choose the plan that works best for your teaching needs
                </p>
              </div>
            </SectionMotion>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto"> 
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: plan.mostPopular ? -8 : -5 }}
                >
                  <Card className={`flex flex-col  text-card-foreground rounded-lg overflow-hidden transition-shadow duration-300 h-[480px] ${
                    plan.mostPopular 
                      ? 'border-2 border-primary hover:shadow-xl relative' 
                      : 'border border-border/50 hover:shadow-lg'
                  }`}> 
                    {plan.mostPopular && (
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground px-6 py-2 text-sm font-semibold rounded-full">
                        Most Popular
                      </div>
                    )}
                    
                    <CardHeader className="pb-4 pt-10"> 
                      <CardTitle className="text-center text-lg font-semibold">{plan.name}</CardTitle>
                      <div className="text-center text-4xl font-bold mt-2">
                        {plan.price}
                        {plan.period && <span className="text-lg font-normal text-card-foreground/60">{plan.period}</span>}
                      </div>
                      <p className="text-center text-sm text-muted-foreground mt-2">{plan.description}</p>
                    </CardHeader>
                    
                    <CardContent className="flex-1 px-6 flex flex-col"> 
                      <ul className="space-y-3 text-sm text-card-foreground/80 mb-6 flex-1">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <div className="mt-auto">
                        <Button className={`w-full ${plan.buttonColor}`} asChild>
                          <Link href={plan.href}>
                            {plan.buttonText}
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted border-t border-border/40 py-8 sm:py-12 lg:py-16">
        <div className="px-4 md:px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-xs sm:text-sm"> 
          <div className="sm:col-span-2 md:col-span-1"> 
            <Link href="/">
              <NoteEarlyLogo className="mb-4 text-foreground"/>
            </Link>
            <p className="text-muted-foreground">
              An educational platform for children ages 5-12 to improve reading comprehension.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2 sm:mb-3 text-foreground">Quick Links</h4> 
            <ul className="space-y-1 sm:space-y-2">
              <li><Link href="#features" className="text-muted-foreground hover:text-popover-foreground transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="text-muted-foreground hover:text-popover-foreground transition-colors">Pricing</Link></li>
              <li><Link href="/blog" className="text-muted-foreground hover:text-popover-foreground transition-colors">Blog</Link></li>
              <li><Link href="/faq" className="text-muted-foreground hover:text-popover-foreground transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-foreground">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/legal?doc=privacy" className="text-muted-foreground hover:text-popover-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/legal?doc=terms" className="text-muted-foreground hover:text-popover-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="/legal?doc=cookies" className="text-muted-foreground hover:text-popover-foreground transition-colors">Cookie Policy</Link></li>
              <li><Link href="/legal?doc=data-processing" className="text-muted-foreground hover:text-popover-foreground transition-colors">Data Processing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-foreground">Contact Us</h4>
            <p className="text-muted-foreground">
              hello@noteearly.com
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <a href="mailto:hello@noteearly.com">Schedule Call</a>
            </Button> 
          </div>
        </div>
        <div className="px-4 md:px-6 mt-8 text-center text-xs text-muted-foreground border-t border-border/40 pt-6"> 
          © {new Date().getFullYear()} NoteEarly. All rights reserved.
        </div>
      </footer>
    </div>
  );
}