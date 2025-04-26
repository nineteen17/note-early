NoteEarly.com – Technical & Monetization Plan

# 1\. Overview of the Technical Stack

Frontend (Web):

\- Framework: Next.js 15  
\- UI Library: React  
\- Styling: Tailwind CSS for a modern, clean interface

Frontend (Mobile):

\- Framework: Expo React Native  
\- UI: Native components to ensure a consistent cross-platform experience

Backend & Infrastructure:

\- Supabase Stack:  
\- Authentication: Supports email/password and OAuth (Google/Apple) with role differentiation (Admin vs. Student)  
\- Database: PostgreSQL stores user profiles, reading modules, progress data, and custom content  
\- Storage: S3-compatible storage for static assets (images, fonts) and pre-formatted in-house reading content  
\- Edge Functions: Serverless functions for background processing (e.g., progress analytics, webhook handling)

\- Optional Express APIs: For custom logic that extends beyond Supabase's built-in capabilities

Payment Integration:

\- Stripe: Manages subscription payments via Stripe Checkout and webhooks for real-time subscription status updates

Text Editor Integration:

\- Lexical (or similar): A lightweight, well-maintained text editor library integrated into the student summary interface for basic grammar and spelling support

# 2\. Content Management & Admin CRM Flow

In-House Content Creation:

\- Curated Library:  
\- A base library of reading modules is created in-house, covering levels 1–10 with a mix of non-fiction and popular themed writings, aligned with New Zealand educational standards.  
\- These modules are pre-formatted to ensure consistency and avoid parsing errors.

Admin CRM for Custom Content:

\- Purpose: A dedicated CRM-style page within the admin dashboard enables parents/teachers to create custom reading modules.  
\- Standardized Template: All custom modules must follow a standardized structure (title, level, content sections, comprehension questions) that mirrors the in-house template to ensure uniformity.  
\- Tiered Limits:  
\- Free Tier: Admins can create one custom module.  
\- Pro Tier: Admins have unlimited custom module creation capabilities.  
\- Access Control: Custom modules are visible only to the creating admin and their linked student sub-accounts.

# 3\. Authentication & Extended User Profile

Admin Accounts (Parents/Teachers):

\- Sign-up via email/password or OAuth (Google/Apple) using Supabase Auth  
\- After login, they must enter a second password (called the Admin Password) to unlock Admin Mode  
\- Admin Password is stored as a hashed field in the 'admins' table (separate from Supabase Auth)  
\- Admins can reset their Admin Password via a secure email verification process

Student Accounts:

\- Created as sub-accounts under an Admin account (not Supabase Auth users)  
\- Use a simple login screen where they pick their name/avatar and enter a 4-digit PIN  
\- PINs are stored securely and hashed in the students table

Extended Profile Schema (profiles table):

CREATE TABLE profiles (  
id UUID PRIMARY KEY REFERENCES auth.users(id),  
full_name VARCHAR(100),  
avatar_url TEXT,  
role VARCHAR(50),  
stripe_customer_id VARCHAR(255),  
subscription_status VARCHAR(50) DEFAULT 'free',  
subscription_plan VARCHAR(50) DEFAULT 'free',  
subscription_renewal_date TIMESTAMP,  
created_at TIMESTAMP DEFAULT now()  
);

Admins can link up to 3 student accounts on the Free tier and up to 50 on the Pro tier.

# 4\. Payment Integration & Monetization Strategy

# Monetization Strategy - NoteEarly

## 1. Overview

NoteEarly employs a freemium model designed to allow users to experience the core value before committing to a paid plan. The strategy includes three tiers: Free, Home, and Pro, providing clear upgrade paths based on user needs, primarily differentiating on scale (number of students) and content access/creation capabilities.

## 2. Tier Details

The following table outlines the specific features, limits, and pricing for each tier:

| Feature                    | Free Tier                 | Home Tier                     | Pro Tier                        |
| :------------------------- | :------------------------ | :---------------------------- | :------------------------------ |
| **Price (Monthly)**        | $0                        | **$7 / month**                | **$19 / month**                 |
| **Price (Annual)**         | N/A                       | **$70 / year** (~$5.83/month) | **$190 / year** (~$15.83/month) |
| _Annual Discount_          |                           | _(Save ~17% - Pay for 10)_    | _(Save ~17% - Pay for 10)_      |
| **Target User**            | Trial Users, Single Child | Parents, Homeschoolers        | Teachers, Tutors, Institutions  |
| **Student Limit**          | **1**                     | **5**                         | **30**                          |
| **Curated Module Access**  | **First 5 Modules Only**  | **All**                       | **All**                         |
| **Custom Module Creation** | No                        | **Yes**                       | **Yes**                         |
| **Custom Module Limit**    | 0                         | **10**                        | **50**                          |

_(Note: Limit enforcement for downgrades will involve making excess students/modules inactive, not deleting data. Users will be prevented from adding new students/modules beyond their tier's limit.)_

## 3. Pricing Rationale

- **Free Tier:** Designed as a generous trial to showcase core reading functionality for a single user/student with limited content.
- **Home Tier ($7/mo):** Priced accessibly for parents/homeschoolers. The primary value is unlocking all curated content and the ability to create custom modules for a small group (up to 5 students). The price aims to be low friction for initial paid adoption.
- **Pro Tier ($19/mo):** Targeted at educators needing scale. The significant increase in student and custom module limits justifies the price jump, while remaining competitive.

## 4. Annual Discount Strategy

Annual plans are offered for the Home and Pro tiers at a price equivalent to 10 months of the monthly cost (~17% discount). This strategy aims to:

- Improve upfront cash flow.
- Increase customer lifetime value.
- Reduce monthly churn.

Separate Price IDs will be required in Stripe for monthly vs. annual plans for both Home and Pro tiers.

## 5. Future Considerations

- Pricing may be revisited based on user feedback, feature additions, and market positioning.
- Usage metrics should be monitored to validate if the limits are appropriate.
- Potential for add-ons or higher tiers (e.g., "Institution" tier) could be explored later.
- Consider how to handle access to the "First 5" curated modules for the Free tier (e.g., based on creation date).

Stripe Payment Flow:

\- Subscription Initiation:  
\- Admins select a plan and are redirected to Stripe Checkout

\- Webhook Handling:  
\- Stripe sends a webhook after payment  
\- Supabase Edge Function updates the Admin profile accordingly

Subscription Management:

\- Admins manage their plans via Stripe's Customer Portal  
\- The system checks the subscription status to unlock Pro features

# 5\. Database Schema (PostgreSQL via Supabase)

Reading Modules Table:

CREATE TABLE reading_modules (  
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  
admin_id UUID REFERENCES profiles(id),  
title VARCHAR(255),  
content TEXT,  
level INT,  
type VARCHAR(50),  
created_at TIMESTAMP DEFAULT now()  
);

Student Progress Table:

CREATE TABLE student_progress (  
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  
student_id UUID REFERENCES profiles(id),  
module_id UUID REFERENCES reading_modules(id),  
completed BOOLEAN DEFAULT false,  
summary_text TEXT,  
created_at TIMESTAMP DEFAULT now()  
);

Sub-Account Linking Table (optional):

CREATE TABLE admin_students (  
admin_id UUID REFERENCES profiles(id),  
student_id UUID REFERENCES profiles(id),  
PRIMARY KEY (admin_id, student_id)  
);

# 6\. Technical Workflow

Admin Content Creation:

\- Admin logs in via Supabase Auth and unlocks Admin Mode using their Admin Password  
\- In Admin Mode, they access the CRM to create or edit modules using a standardized form  
\- Custom modules become available to their linked student accounts

Student Interaction:

\- Students log in by selecting their profile and entering their PIN  
\- They access curated + custom modules, mark completion, and write summaries using a Lexical-based editor

Progress Tracking:

\- Submissions are recorded in student_progress  
\- Admins can view progress dashboards and optionally provide feedback

# 7\. Mobile (Expo React Native) Considerations

\- Mirrors web functionality  
\- Optimized for touch interaction for kids and adults  
\- Supports basic offline access with later sync

# 8\. Admin Dashboard & CRM Integration

\- Admin Dashboard includes:  
\- User management (linked students)  
\- CRM content creation tools  
\- Progress analytics dashboards

\- Custom modules are only visible to that Admin's student network

\- Future Enterprise Features:  
\- Teachers can manage multiple classrooms, share content

# 9\. Future Enhancements

\- Expanded text editor grammar tools  
\- AI-powered personalized learning suggestions  
\- Advanced analytics for engagement and progress  
\- Multi-classroom support for teacher accounts

# 10\. Summary & Conclusion

NoteEarly.com uses modern web/mobile frameworks with Supabase and Stripe integrations to deliver a secure, interactive reading platform.  
The two-step Admin authentication—via Supabase login and a separate Admin Password—ensures secure access for parents/teachers even on shared devices.  
Meanwhile, children enjoy a safe, simplified interface tailored to their learning needs.

Slogan: "Not just reading—understanding begins here."
