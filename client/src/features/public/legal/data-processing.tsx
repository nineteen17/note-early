import React from 'react';
import { Database, Shield, Users, FileText, Mail, ExternalLink, Phone } from 'lucide-react';

const DataProcessing = () => {
  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-3 mb-3">
          <Database className="w-6 h-6 text-popover-foreground" />
          <h2 className="text-3xl font-bold text-foreground">Data Processing Agreement</h2>
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
          This Data Processing Agreement ("DPA") describes how NoteEarly processes personal information 
          in accordance with the New Zealand Privacy Act 2020. This agreement applies to all personal 
          information we collect, use, store, and share through our service.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          2. Key Definitions
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              term: "Personal Information",
              definition: "Information about an identifiable individual, as defined by the Privacy Act 2020",
              icon: Users
            },
            {
              term: "Data Controller", 
              definition: "NoteEarly, which determines the purposes and means of processing personal information",
              icon: Shield
            },
            {
              term: "Data Subject",
              definition: "The individual whose personal information is being processed",
              icon: Users
            },
            {
              term: "Processing",
              definition: "Any operation performed on personal information, including collection, storage, use, and disclosure",
              icon: Database
            }
          ].map((item, index) => (
            <div key={index} className="bg-muted/30 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <item.icon className="w-4 h-4 text-popover-foreground" />
                <h4 className="font-semibold text-foreground">{item.term}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{item.definition}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          3. Lawful Basis for Processing
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-6">
          We process personal information based on the following lawful grounds:
        </p>
        
        <div className="grid gap-4">
          <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-6 rounded-lg">
            <h4 className="font-medium text-foreground mb-3">Performance of Contract</h4>
            <p className="text-sm text-muted-foreground mb-3">Processing necessary to provide our educational service:</p>
            <ul className="space-y-1">
              {[
                "Account creation and management",
                "Reading module storage and synchronization", 
                "Customer support and technical assistance"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-l-4 border-green-500 bg-green-50 dark:bg-green-950/30 p-6 rounded-lg">
            <h4 className="font-medium text-foreground mb-3">Legitimate Interest</h4>
            <p className="text-sm text-muted-foreground mb-3">Processing for our legitimate business interests:</p>
            <ul className="space-y-1">
              {[
                "Service improvement and development",
                "Security monitoring and fraud prevention",
                "Business analytics and research"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-6 rounded-lg">
            <h4 className="font-medium text-foreground mb-3">Consent</h4>
            <p className="text-sm text-muted-foreground mb-3">Processing based on your explicit consent:</p>
            <ul className="space-y-1">
              {[
                "Marketing communications (opt-in)",
                "Non-essential cookies and tracking",
                "Sharing information with third parties for specific purposes"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          4. Categories of Personal Information
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              category: "Identity Information",
              items: ["Full name", "Email address", "Username", "Profile information"],
              color: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
            },
            {
              category: "Technical Information", 
              items: ["IP address", "Device information", "Browser type", "Operating system"],
              color: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
            },
            {
              category: "Usage Information",
              items: ["Login patterns", "Feature usage", "Navigation data", "Performance metrics"],
              color: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800"
            },
            {
              category: "Content Information",
              items: ["Reading modules", "User content", "Educational progress", "Learning data"],
              color: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"
            }
          ].map((category, index) => (
            <div key={index} className={`p-4 border rounded-lg ${category.color}`}>
              <h4 className="font-medium text-foreground mb-3">{category.category}</h4>
              <ul className="space-y-1">
                {category.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-1 h-1 bg-current rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          5. Data Processing Activities
        </h3>
        <div className="overflow-x-auto">
          <div className="min-w-full bg-muted/30 border border-border rounded-lg">
            <div className="grid grid-cols-4 gap-4 p-4 border-b border-border bg-muted/50 font-medium text-sm text-foreground">
              <div>Activity</div>
              <div>Purpose</div>
              <div>Legal Basis</div>
              <div>Retention</div>
            </div>
            {[
              ["Account Management", "Service provision", "Contract", "Account lifetime"],
              ["Module Storage", "Core functionality", "Contract", "Account lifetime"],
              ["Usage Analytics", "Service improvement", "Legitimate Interest", "2 years"],
              ["Security Monitoring", "Fraud prevention", "Legitimate Interest", "1 year"],
              ["Customer Support", "Issue resolution", "Contract", "3 years"]
            ].map((row, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 p-4 border-b border-border last:border-b-0 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">{row[0]}</div>
                <div>{row[1]}</div>
                <div>{row[2]}</div>
                <div>{row[3]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          6. Your Rights as a Data Subject
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "Access", description: "Request a copy of your personal information" },
            { title: "Correction", description: "Request correction of inaccurate information" },
            { title: "Deletion", description: "Request deletion of your personal information" },
            { title: "Portability", description: "Receive your data in a structured format" },
            { title: "Objection", description: "Object to certain processing activities" },
            { title: "Complaint", description: "Lodge a complaint with the Privacy Commissioner" }
          ].map((right, index) => (
            <div key={index} className="bg-primary/5 border border-popover-foreground/20 rounded-lg p-4">
              <h4 className="font-medium text-popover-foreground mb-2">Right to {right.title}</h4>
              <p className="text-xs text-muted-foreground">{right.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          7. Data Security Measures
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-6">
          We implement comprehensive security measures to protect personal information:
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              title: "Technical Safeguards",
              items: ["Encryption in transit and at rest", "Multi-factor authentication", "Regular security updates"],
              icon: Shield,
              color: "bg-green-50 dark:bg-green-950/30"
            },
            {
              title: "Administrative Safeguards", 
              items: ["Access controls", "Employee training", "Data handling procedures"],
              icon: Users,
              color: "bg-blue-50 dark:bg-blue-950/30"
            },
            {
              title: "Physical Safeguards",
              items: ["Secure data centers", "Environmental controls", "Access monitoring"],
              icon: Database,
              color: "bg-purple-50 dark:bg-purple-950/30"
            }
          ].map((safeguard, index) => (
            <div key={index} className={`p-6 rounded-lg text-center ${safeguard.color}`}>
              <safeguard.icon className="w-8 h-8 text-popover-foreground mx-auto mb-4" />
              <h4 className="font-medium text-foreground mb-3">{safeguard.title}</h4>
              <ul className="space-y-1">
                {safeguard.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="text-sm text-muted-foreground">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          8. Contact Information
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-6">
          For data processing inquiries or to exercise your rights:
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-primary/5 border border-popover-foreground/20 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-popover-foreground flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-foreground mb-3">Direct Contact</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Data Protection Officer:</p>
                    <a href="mailto:dpo@noteearly.com" className="text-popover-foreground hover:text-popover-foreground/80 font-medium">
                      dpo@noteearly.com
                    </a>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Privacy Inquiries:</p>
                    <a href="mailto:privacy@noteearly.com" className="text-popover-foreground hover:text-popover-foreground/80 font-medium">
                      privacy@noteearly.com
                    </a>
                  </div>
                  <p className="text-muted-foreground">Response Time: Within 20 working days</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <ExternalLink className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-foreground mb-3">Privacy Commissioner</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">Office of the Privacy Commissioner</p>
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
                  <p className="text-muted-foreground">Phone: 0800 803 909</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DataProcessing;