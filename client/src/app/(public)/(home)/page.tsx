import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { NoteEarlyLogo } from '@/components/NoteEarlyLogo';
// Placeholder components for icons/images - replace with actual implementations
const PlaceholderIcon = ({ className }: { className?: string }) => (
  <div className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center ${className}`}>
    <span className="text-muted-foreground text-xl">?</span>
  </div>
);

const Illustration = ({ className }: { className?: string }) => (
  <div className={`relative w-full h-64 md:h-80 lg:h-96 ${className}`}>
    <Image
      src="/teacher-student.png"
      alt="Illustration of a teacher and student"
      fill
      className="object-cover"
    />
  </div>
);



export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header - Apply primary background */} 
      <header className="sticky top-0 z-50 border-b border-primary/20 bg-primary text-primary-foreground">
        <div className="container flex h-14 items-center px-4 sm:px-6 lg:px-8"> 
          <Link href="/">
            <NoteEarlyLogo className="text-primary-foreground"/>
          </Link>
          <nav className="ml-6 hidden md:flex items-center space-x-6 text-sm font-medium">
            {/* Adjust link colors for primary background */}
            <Link href="/" className="transition-colors hover:text-primary-foreground/80 text-primary-foreground">Home</Link> 
            <Link href="#features" className="transition-colors hover:text-primary-foreground/80 text-primary-foreground">Features</Link>
            <Link href="#pricing" className="transition-colors hover:text-primary-foreground/80 text-primary-foreground">Pricing</Link>
            <Link href="/blog" className="transition-colors hover:text-primary-foreground/80 text-primary-foreground">Blog</Link>
          </nav>
          <div className="flex flex-1 items-center justify-end space-x-2">
            {/* Adjust button variants for contrast */}
            <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link href="/signup">Register</Link>
            </Button>
            {/* Use the restored ThemeToggle */}
            <ThemeToggle /> 
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center"> 
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6"> 
              {/* Removed the text-red-300 class */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-tight text-foreground"> 
                Not just reading—<br/>understanding begins here.
              </h1>
              <p className="text-base text-muted-foreground max-w-[600px]">
                An educational platform for children ages 5-12 to improve reading comprehension.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"> 
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">Get Started</Button>
                <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                   <Link href="/login">Login</Link>
                </Button>
              </div>
            </div>
            <div className="flex justify-center items-center mt-10 md:mt-0"> 
              <Illustration className="w-72 h-72 md:w-80 md:h-80 lg:w-96 lg:h-96" /> 
            </div>
          </div>
        </section>

        {/* Key Features Section */}
        <section id="features" className="w-full py-16 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6"> 
            <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12 lg:mb-16 text-foreground">Key Features</h2> 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12"> 
              {/* Cards should use bg-card, text-card-foreground */}
              <Card className="bg-card text-card-foreground border border-border/50 rounded-lg overflow-hidden"> 
                <CardHeader className="items-center pt-8 pb-4"> 
                  <PlaceholderIcon />
                </CardHeader>
                <CardContent className="text-center px-6 pb-8"> 
                  <CardTitle className="mb-2 text-xl">Reading Modules</CardTitle> 
                  <p className="text-card-foreground/80 text-sm">
                    Levels 1-10 with progressive difficulty for children at different reading stages
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card text-card-foreground border border-border/50 rounded-lg overflow-hidden">
                <CardHeader className="items-center pt-8 pb-4">
                  <PlaceholderIcon />
                </CardHeader>
                <CardContent className="text-center px-6 pb-8">
                  <CardTitle className="mb-2 text-xl">Create Content</CardTitle>
                  <p className="text-card-foreground/80 text-sm">
                    Customize your own reading modules with our easy-to-use editor
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card text-card-foreground border border-border/50 rounded-lg overflow-hidden">
                <CardHeader className="items-center pt-8 pb-4">
                  <PlaceholderIcon />
                </CardHeader>
                <CardContent className="text-center px-6 pb-8">
                  <CardTitle className="mb-2 text-xl">Progress Tracking</CardTitle>
                  <p className="text-card-foreground/80 text-sm">
                    Monitor reading progress and comprehension improvements over time
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="w-full py-16 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6"> 
            <h2 className="text-3xl lg:text-4xl font-bold text-center mb-4 text-foreground">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground text-center mb-12 lg:mb-16"> 
              Choose the plan that works best for your teaching needs
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto"> 
              {/* Free Plan */}
              <Card className="flex flex-col bg-card text-card-foreground border border-border/50 rounded-lg overflow-hidden"> 
                <CardHeader className="pb-4 pt-6"> 
                  <CardTitle className="text-center text-base sm:text-lg font-semibold">Free</CardTitle>
                  <div className="text-center text-3xl sm:text-4xl font-bold mt-2">$0</div>
                </CardHeader>
                <CardContent className="flex-1 px-4 sm:px-6"> 
                  <ul className="space-y-2 text-xs sm:text-sm text-card-foreground/80 list-disc list-inside mb-6">
                    <li>1 student</li>
                    <li>Basic modules</li>
                    <li>Limited features</li>
                  </ul>
                </CardContent>
                 <div className="p-6 pt-0 mt-auto">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Get Started</Button>
                 </div>
              </Card>
              {/* Home Plan */}
              <Card className="flex flex-col bg-card text-card-foreground border-2 border-primary rounded-lg overflow-hidden"> 
                <CardHeader className="pb-4 pt-6">
                  <CardTitle className="text-center text-lg font-semibold">Home</CardTitle>
                  <div className="text-center text-4xl font-bold mt-2">$7<span className="text-lg font-normal text-card-foreground/60">/mo</span></div>
                </CardHeader>
                <CardContent className="flex-1 px-6">
                  <ul className="space-y-2 text-sm text-card-foreground/80 list-disc list-inside mb-6">
                    <li>5 students</li>
                    <li>All modules</li>
                    <li>10 custom modules</li>
                    <li>Basic analytics</li>
                  </ul>
                </CardContent>
                 <div className="p-6 pt-0 mt-auto">
                  <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">Choose Home</Button>
                 </div>
              </Card>
              {/* Pro Plan */}
              <Card className="flex flex-col bg-card text-card-foreground border border-border/50 rounded-lg overflow-hidden"> 
                <CardHeader className="pb-4 pt-6">
                  <CardTitle className="text-center text-lg font-semibold">Pro</CardTitle>
                  <div className="text-center text-4xl font-bold mt-2">$19<span className="text-lg font-normal text-card-foreground/60">/mo</span></div>
                </CardHeader>
                <CardContent className="flex-1 px-6">
                  <ul className="space-y-2 text-sm text-card-foreground/80 list-disc list-inside mb-6">
                    <li>30 students</li>
                    <li>All modules</li>
                    <li>50 custom modules</li>
                    <li>Advanced analytics</li>
                  </ul>
                </CardContent>
                 <div className="p-6 pt-0 mt-auto">
                  <Button className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">Choose Pro</Button>
                 </div>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted border-t border-border/40 py-8 sm:py-12 lg:py-16">
          <div className="container px-4 md:px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-xs sm:text-sm"> 
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
                      <li><Link href="#features" className="text-muted-foreground hover:text-primary">Features</Link></li>
                      <li><Link href="#pricing" className="text-muted-foreground hover:text-primary">Pricing</Link></li>
                      <li><Link href="/blog" className="text-muted-foreground hover:text-primary">Blog</Link></li>
                      <li><Link href="/faq" className="text-muted-foreground hover:text-primary">FAQ</Link></li>
                  </ul>
              </div>
               <div>
                  <h4 className="font-semibold mb-3 text-foreground">Legal</h4>
                  <ul className="space-y-2">
                      <li><Link href="/privacy" className="text-muted-foreground hover:text-primary">Privacy Policy</Link></li>
                      <li><Link href="/terms" className="text-muted-foreground hover:text-primary">Terms of Service</Link></li>
                      <li><Link href="/cookies" className="text-muted-foreground hover:text-primary">Cookie Policy</Link></li>
                      <li><Link href="/data-processing" className="text-muted-foreground hover:text-primary">Data Processing</Link></li>
                  </ul>
              </div>
               <div>
                  <h4 className="font-semibold mb-3 text-foreground">Contact Us</h4>
                   <p className="text-muted-foreground">
                      [Your Contact Info Here] <br/>
                      [Address Line 1] <br/>
                      [Address Line 2]
                   </p>
                   <Button variant="outline" size="sm" className="mt-4">Calendar</Button> 
              </div>
          </div>
          <div className="container px-4 md:px-6 mt-8 text-center text-xs text-muted-foreground border-t border-border/40 pt-6"> 
              © {new Date().getFullYear()} NoteEarly. All rights reserved.
          </div>
      </footer>
    </div>
  );
}