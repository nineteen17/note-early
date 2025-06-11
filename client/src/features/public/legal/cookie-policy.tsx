import React from 'react';
import { Cookie, Settings, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

const CookiePolicy = () => {
  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-3 mb-3">
          <Cookie className="w-6 h-6 text-popover-foreground" />
          <h2 className="text-3xl font-bold text-foreground">Cookie Policy</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Effective Date: {new Date().toLocaleDateString('en-NZ', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          1. What Are Cookies
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          Cookies are small text files that are placed on your computer or mobile device when you visit 
          our website. They are widely used to make websites work more efficiently and to provide 
          information to website owners. This policy explains how NoteEarly uses cookies and similar 
          tracking technologies.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          2. How We Use Cookies
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          We use cookies to enhance your experience on our website and improve our services. Cookies 
          help us understand how you use our website, remember your preferences, and provide you with 
          a personalized experience.
        </p>
      </section>

      <section className="space-y-6">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          3. Types of Cookies We Use
        </h3>
        
        <div className="grid gap-6">
          <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              <h4 className="text-lg font-medium text-foreground">Essential Cookies</h4>
            </div>
            <p className="text-muted-foreground mb-4">
              These cookies are necessary for our website to function properly and cannot be disabled. They include:
            </p>
            <ul className="space-y-2 mb-4">
              {[
                "Authentication cookies to keep you logged in",
                "Security cookies to protect against malicious attacks",
                "Session cookies to maintain your preferences during a visit"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground bg-white/50 dark:bg-black/20 p-2 rounded">
              <strong>Legal basis:</strong> Necessary for the performance of our service
            </p>
          </div>

          <div className="border-l-4 border-green-500 bg-green-50 dark:bg-green-950/30 p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-6 h-6 text-green-600" />
              <h4 className="text-lg font-medium text-foreground">Functional Cookies</h4>
            </div>
            <p className="text-muted-foreground mb-4">
              These cookies enhance the functionality of our website by remembering your choices:
            </p>
            <ul className="space-y-2 mb-4">
              {[
                "Language and region preferences",
                "Theme and display settings",
                "User interface customizations"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground bg-white/50 dark:bg-black/20 p-2 rounded">
              <strong>Legal basis:</strong> Your consent (optional cookies)
            </p>
          </div>

          <div className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <h4 className="text-lg font-medium text-foreground">Analytics Cookies</h4>
            </div>
            <p className="text-muted-foreground mb-4">
              These cookies help us understand how visitors interact with our website:
            </p>
            <ul className="space-y-2 mb-4">
              {[
                "Page views and user navigation patterns",
                "Time spent on different pages",
                "Popular features and content",
                "Error tracking and performance monitoring"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="text-xs text-muted-foreground bg-white/50 dark:bg-black/20 p-2 rounded space-y-1">
              <p><strong>Legal basis:</strong> Your consent (optional cookies)</p>
              <p><strong>Third parties:</strong> Google Analytics (anonymized data)</p>
            </div>
          </div>

          <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <Cookie className="w-6 h-6 text-red-600" />
              <h4 className="text-lg font-medium text-foreground">Marketing Cookies</h4>
            </div>
            <p className="text-muted-foreground mb-4">
              Currently, we do not use marketing or advertising cookies. If this changes in the future, 
              we will update this policy and seek your explicit consent.
            </p>
            <p className="text-xs text-muted-foreground bg-white/50 dark:bg-black/20 p-2 rounded">
              <strong>Status:</strong> Not currently used
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          4. Third-Party Cookies
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Some cookies on our website are set by third-party services that appear on our pages:
        </p>
        <div className="bg-muted/30 border border-border rounded-lg p-6">
          <h4 className="font-medium text-foreground mb-3">Google Analytics</h4>
          <p className="text-sm text-muted-foreground mb-3">
            We use Google Analytics to help analyze how users use our website. These cookies collect 
            information anonymously and report website trends without identifying individual visitors.
          </p>
          <a 
            href="https://policies.google.com/privacy" 
            className="text-popover-foreground hover:text-popover-foreground/80 text-sm font-medium inline-flex items-center gap-1" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            Google Privacy Policy <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          5. Managing Your Cookie Preferences
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
            <h4 className="text-lg font-medium text-foreground mb-4">Cookie Consent</h4>
            <p className="text-muted-foreground text-sm mb-4">
              When you first visit our website, we will ask for your consent to use non-essential cookies. 
              You can change your preferences at any time by clicking the "Cookie Settings" link in our footer.
            </p>
          </div>

          <div className="bg-primary/5 border border-popover-foreground/20 rounded-lg p-6">
            <h4 className="text-lg font-medium text-foreground mb-4">Browser Settings</h4>
            <p className="text-muted-foreground text-sm mb-4">
              You can control cookies through your browser settings:
            </p>
            <ul className="space-y-2">
              {[
                { browser: "Chrome", path: "Settings → Privacy and security → Cookies and other site data" },
                { browser: "Firefox", path: "Preferences → Privacy & Security → Cookies and Site Data" },
                { browser: "Safari", path: "Preferences → Privacy → Manage Website Data" },
                { browser: "Edge", path: "Settings → Privacy, search, and services → Cookies and site permissions" }
              ].map((item, index) => (
                <li key={index} className="text-sm">
                  <strong className="text-foreground">{item.browser}:</strong> 
                  <span className="text-muted-foreground ml-1">{item.path}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground mb-2">Important Note</h4>
              <p className="text-sm text-muted-foreground">
                Disabling certain cookies may affect the functionality of our website. Essential cookies 
                cannot be disabled as they are necessary for the basic operation of our service.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          6. Your Rights
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Under the Privacy Act 2020, you have the right to:
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            "Know what personal information is collected through cookies",
            "Withdraw your consent for non-essential cookies at any time",
            "Request deletion of personal information collected through cookies",
            "Access information about how cookies are used"
          ].map((right, index) => (
            <div key={index} className="flex items-start gap-3 p-4 bg-primary/5 border border-popover-foreground/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-popover-foreground flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground text-sm">{right}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          7. Contact Us
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-4">
          If you have any questions about our use of cookies, please contact us:
        </p>
        <div className="bg-primary/5 border border-popover-foreground/20 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Cookie className="w-5 h-5 text-popover-foreground flex-shrink-0 mt-1" />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Email us at:</p>
              <a 
                href="mailto:privacy@noteearly.com" 
                className="text-popover-foreground hover:text-popover-foreground/80 font-medium"
              >
                privacy@noteearly.com
              </a>
              <p className="text-xs text-muted-foreground mt-2">Subject: Cookie Policy Inquiry</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CookiePolicy;