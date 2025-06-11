import React from 'react';
import { Shield, Eye, Lock, Mail, Phone, ExternalLink } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-6 h-6 text-popover-foreground" />
          <h2 className="text-3xl font-bold text-foreground">Privacy Policy</h2>
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
          1. Introduction
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          NoteEarly ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
          explains how we collect, use, disclose, and safeguard your information when you use our service. 
          This policy complies with the New Zealand Privacy Act 2020 and applies to all users of our service.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          2. Information We Collect
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-muted/30 border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-popover-foreground" />
              <h4 className="text-lg font-medium text-foreground">Personal Information</h4>
            </div>
            <p className="text-muted-foreground text-sm mb-3">
              We may collect personal information that you voluntarily provide, including:
            </p>
            <ul className="space-y-2">
              {[
                "Name and email address (when you create an account)",
                "Profile information you choose to provide",
                "Content you create and store in your notes",
                "Communications you send to us"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-muted/30 border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-popover-foreground" />
              <h4 className="text-lg font-medium text-foreground">Technical Information</h4>
            </div>
            <p className="text-muted-foreground text-sm mb-3">
              We automatically collect certain technical information, including:
            </p>
            <ul className="space-y-2">
              {[
                "IP address and location data",
                "Browser type and version",
                "Device information and operating system",
                "Usage data and analytics",
                "Cookies and similar tracking technologies"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          3. How We Use Your Information
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-4">
          We use your information for the following purposes:
        </p>
        <div className="grid gap-3">
          {[
            "To provide, maintain, and improve our service",
            "To create and manage your account",
            "To respond to your inquiries and provide customer support",
            "To send you important notices about your account or our service",
            "To analyze usage patterns and improve user experience",
            "To detect, prevent, and address technical issues and security breaches",
            "To comply with legal obligations"
          ].map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-accent/10 border border-accent/30 rounded-lg">
              <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          4. Information Sharing and Disclosure
        </h3>
        <div className="bg-muted/50 border border-border rounded-lg p-6 mb-6">
          <p className="text-muted-foreground leading-relaxed mb-4">
            We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
          </p>
        </div>
        <div className="grid gap-4">
          {[
            {
              title: "Service Providers",
              description: "With trusted third-party service providers who help us operate our service",
              color: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
            },
            {
              title: "Legal Requirements", 
              description: "When required by law or to protect our rights and safety",
              color: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
            },
            {
              title: "Business Transfers",
              description: "In connection with a merger, acquisition, or sale of assets", 
              color: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800"
            },
            {
              title: "Consent",
              description: "With your explicit consent for specific purposes",
              color: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
            }
          ].map((item, index) => (
            <div key={index} className={`p-4 border rounded-lg ${item.color}`}>
              <h5 className="font-medium text-foreground mb-1">{item.title}:</h5>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          5. Your Rights Under the Privacy Act 2020
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Under the New Zealand Privacy Act 2020, you have the following rights:
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { title: "Access", description: "Request access to personal information we hold about you" },
            { title: "Correction", description: "Request correction of inaccurate or incomplete information" },
            { title: "Deletion", description: "Request deletion of your personal information (subject to legal requirements)" },
            { title: "Portability", description: "Request a copy of your data in a commonly used format" },
            { title: "Objection", description: "Object to certain uses of your personal information" },
            { title: "Complaint", description: "Lodge a complaint with the Privacy Commissioner if you believe we have breached your privacy" }
          ].map((right, index) => (
            <div key={index} className="bg-primary/5 border border-popover-foreground/20 rounded-lg p-4">
              <h5 className="font-medium text-popover-foreground mb-2">Right to {right.title}</h5>
              <p className="text-sm text-muted-foreground">{right.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          6. Data Security
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-6">
          We implement appropriate technical and organizational security measures to protect your personal 
          information against unauthorized access, alteration, disclosure, or destruction. These measures include:
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            "Encryption of data in transit and at rest",
            "Multi-factor authentication", 
            "Regular security assessments and updates",
            "Access controls and authentication measures",
            "Employee training on data protection"
          ].map((measure, index) => (
            <div key={index} className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
              <Lock className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{measure}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          7. Data Retention
        </h3>
        <div className="bg-muted/50 border border-border rounded-lg p-6">
          <p className="text-muted-foreground leading-relaxed">
            We retain your personal information only for as long as necessary to fulfill the purposes outlined 
            in this Privacy Policy, unless a longer retention period is required or permitted by law. When we 
            no longer need your information, we will securely delete or anonymize it.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          8. International Data Transfers
        </h3>
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
          <p className="text-muted-foreground leading-relaxed">
            Your information may be transferred to and processed in countries other than New Zealand. We ensure 
            that such transfers comply with applicable privacy laws and that appropriate safeguards are in place 
            to protect your information.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          9. Children's Privacy
        </h3>
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
          <p className="text-muted-foreground leading-relaxed">
            Our service is not intended for children under 13 years of age. We do not knowingly collect 
            personal information from children under 13. If we become aware that we have collected personal 
            information from a child under 13, we will take steps to delete such information.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          10. Changes to This Privacy Policy
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify you of any material changes 
          by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage 
          you to review this Privacy Policy periodically.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          11. Contact Us
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-6">
          If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us:
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-primary/5 border border-popover-foreground/20 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-popover-foreground flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-medium text-foreground mb-2">Direct Contact</h5>
                <p className="text-sm text-muted-foreground mb-2">Privacy inquiries:</p>
                <a 
                  href="mailto:privacy@noteearly.com" 
                  className="text-popover-foreground hover:text-popover-foreground/80 font-medium block"
                >
                  privacy@noteearly.com
                </a>
                <p className="text-sm text-muted-foreground mt-2">Data Protection Officer available upon request</p>
                <p className="text-sm text-muted-foreground">Response Time: Within 20 working days</p>
              </div>
            </div>
          </div>
          
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <ExternalLink className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-medium text-foreground mb-2">Privacy Commissioner</h5>
                <p className="text-sm text-muted-foreground mb-2">Office of the Privacy Commissioner</p>
                <a 
                  href="https://www.privacy.org.nz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent/80 font-medium block"
                >
                  www.privacy.org.nz
                </a>
                <a 
                  href="mailto:enquiries@privacy.org.nz" 
                  className="text-accent hover:text-accent/80 font-medium block"
                >
                  enquiries@privacy.org.nz
                </a>
                <p className="text-sm text-muted-foreground mt-2">Phone: 0800 803 909</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;