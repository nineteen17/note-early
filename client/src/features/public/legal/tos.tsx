import React from 'react';
import { CheckCircle, Scale, Mail } from 'lucide-react';

const Tos = () => {
  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-3 mb-3">
          <Scale className="w-6 h-6 text-popover-foreground" />
          <h2 className="text-3xl font-bold text-foreground">Terms of Service</h2>
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
          1. Acceptance of Terms
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          By accessing and using NoteEarly ("the Service"), you accept and agree to be bound by the 
          terms and provision of this agreement. If you do not agree to abide by the above, please 
          do not use this service.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          2. Description of Service
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          NoteEarly is a reading comprehension and educational platform that allows users to create, 
          organize, and manage reading modules and educational content. The Service is provided to you subject 
          to your acceptance of all terms, conditions, policies and notices stated here.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          3. User Accounts
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-4">
          To access certain features of the Service, you must register for an account. You agree to:
        </p>
        <div className="grid gap-3">
          {[
            "Provide accurate, current and complete information during registration",
            "Maintain the security of your password and account",
            "Accept responsibility for all activities under your account", 
            "Notify us immediately of any unauthorized use of your account"
          ].map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          4. User Content and Conduct
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-4">
          You are solely responsible for your content and conduct on NoteEarly. You agree not to:
        </p>
        <div className="grid gap-3">
          {[
            "Upload, post, or transmit any unlawful, harmful, or inappropriate content",
            "Violate any applicable laws or regulations",
            "Infringe upon the intellectual property rights of others",
            "Attempt to gain unauthorized access to the Service or other users' accounts",
            "Use the Service for any commercial purposes without our prior written consent"
          ].map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              <div className="w-5 h-5 bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-destructive text-sm font-bold">×</span>
              </div>
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          5. Privacy and Data Protection
        </h3>
        <div className="bg-muted/50 border border-border rounded-lg p-6">
          <p className="text-muted-foreground leading-relaxed">
            Your privacy is important to us. Our collection, use, and disclosure of personal information 
            is governed by our Privacy Policy, which complies with the New Zealand Privacy Act 2020. 
            By using our Service, you consent to the collection and use of information in accordance 
            with our Privacy Policy.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          6. Intellectual Property Rights
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          The Service and its original content, features, and functionality are and will remain the 
          exclusive property of NoteEarly and its licensors. The Service is protected by copyright, 
          trademark, and other laws. You retain ownership of content you create and upload to the Service.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          7. Consumer Guarantees Act 1993
        </h3>
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
          <p className="text-muted-foreground leading-relaxed">
            If you are a consumer in New Zealand, you have rights under the Consumer Guarantees Act 1993 
            that cannot be excluded. Where the Consumer Guarantees Act 1993 applies, nothing in these 
            terms limits or excludes any guarantee, warranty, condition or undertaking, or any right 
            to damages or other remedy, under that Act.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          8. Limitation of Liability
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          To the extent permitted by law, NoteEarly shall not be liable for any indirect, incidental, 
          special, consequential, or punitive damages, or any loss of profits or revenues, whether 
          incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          9. Termination
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          We may terminate or suspend your account and bar access to the Service immediately, without 
          prior notice or liability, under our sole discretion, for any reason whatsoever, including 
          without limitation if you breach the Terms.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          10. Governing Law
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          These Terms shall be governed by and construed in accordance with the laws of New Zealand. 
          Any disputes arising under or in connection with these Terms shall be subject to the 
          exclusive jurisdiction of the New Zealand courts.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          11. Changes to Terms
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          We reserve the right to modify or replace these Terms at any time. If a revision is material, 
          we will provide at least 30 days notice prior to any new terms taking effect.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-popover-foreground border-l-4 border-popover-foreground pl-4">
          12. Contact Information
        </h3>
        <div className="bg-popover-foreground/5 border border-popover-foreground/20 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-popover-foreground flex-shrink-0 mt-1" />
            <div>
              <p className="text-muted-foreground leading-relaxed mb-2">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <a 
                href="mailto:legal@noteearly.com" 
                className="text-popover-foreground hover:text-popover-foreground/80 font-medium"
              >
                legal@noteearly.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Tos;