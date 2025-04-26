NoteEarly.com – Business Plan

# 1\. Executive Summary

## Concept

NoteEarly.com is an innovative educational platform tailored for children aged 5–12 and their parents or teachers. Unlike standard reading apps, NoteEarly.com emphasizes reading comprehension, ensuring kids truly understand what they read.  
  
The platform features:  
\- A curated in-house library of reading modules organized by 10 progressive levels.  
\- A dedicated CRM-style dashboard for Admins (parents/teachers) to create and manage custom reading content.  
\- Integration with New Zealand educational standards.

## Target Audience

\- Students (ages 5–12)  
\- Admins (parents/teachers)  
  
Admins can:  
\- Create reading modules (1 for free, unlimited on Pro)  
\- Manage student sub-accounts (3 on free tier, 50 on Pro)  
\- Track student progress via analytics  
  
Students interact through a simplified login experience without needing emails or passwords.

## Monetization Strategy

Freemium Model:  
Free Tier: Access to 3 curated modules, 1 custom module, up to 3 student accounts  
Pro ($7.99/mo or $79.99/yr): Unlimited modules, unlimited custom content, 50 student accounts  
  
Stripe is used for subscription billing, including customer portal management and webhook updates.

# 2\. Authentication & Security Flow

## Admin Authentication (2-Step Flow)

Admins go through two layers of authentication:  
  
1\. Primary Login (Supabase Auth)  
\- Method: Email/password or OAuth (Google/Apple)  
\- Purpose: Access to the platform and secure session  
\- Backend: Supabase Auth  
  
2\. Admin Mode Unlock (Internal Admin Password)  
\- Method: A second internal password set by the admin  
\- Used when: Selecting the Admin profile after login on the "Who's using NoteEarly?" screen  
\- Stored: As a hashed field in the admins table (not part of Supabase Auth)  
  
Admin Password Reset:  
\- If forgotten, the Admin can request a reset link via email (using Supabase email verification).  
\- Once verified, they’re redirected to a secure page to set a new Admin Password.

## Student Access (PIN-Based, No Supabase Auth)

\- Students do not use email or password.  
\- Students choose their profile, enter a 4-digit PIN, and access their interface.  
\- PINs are hashed and stored in the students table.  
\- All student data is scoped under the Admin session and cannot access admin functionality.

# 3\. Technical Implementation

## Frontend

\- Web: Next.js 15 + React + Tailwind CSS  
\- Mobile: Expo React Native

## Backend Infrastructure

\- Supabase Stack:  
\- Auth: Email/password + OAuth for Admins  
\- Database: PostgreSQL  
\- Storage: S3-compatible for static files and modules  
\- Edge Functions: For Stripe webhook handling, analytics tracking, and optional custom logic

## Admin Features

\- CRM-style content creation with standardized templates  
\- Progress tracking, analytics, and student management  
\- Internal Admin Password system for protected admin access

## Student Features

\- Access to assigned modules and summary writing tool  
\- Uses a PIN system, tied to the Admin's session  
\- All data is scoped by the admin\_id

## Subscription & Payments

\- Stripe Checkout for upgrading  
\- Stripe Webhooks update Supabase on plan changes  
\- Admins access subscription management through Stripe Customer Portal

# 4\. Design & User Experience

## Visual Design

\- Friendly, warm, and professional  
\- Kid-friendly layout with large touch targets  
\- Distinct experiences for Admins and Students

## Key Screens

\- User Selection Screen: “Who’s using NoteEarly today?”  
\- Lists admin and student accounts  
\- Tapping Admin requires Admin Password  
\- Tapping a student requires PIN  
\- Admin Dashboard: CRM tools, module creation, analytics  
\- Student Interface: Reading and summary writing with Lexical text editor  
\- Password Reset Flows: Email verification for Admin Password resets

# 5\. Marketing & User Acquisition

\- Educational blog content and SEO targeting parents and teachers  
\- Influencer and school partnerships  
\- Free pilot programs for classrooms  
\- Paid ads on Facebook, Instagram, and parenting forums  
\- Referral rewards for sharing

# 6\. Summary & Next Steps

NoteEarly.com blends a secure, well-structured platform with intuitive design and education-aligned content. The new two-step admin authentication ensures that even on shared devices, Admin functionality remains protected.

Next Milestones:  
\- Finalize MVP with core reading modules and student interface  
\- Implement admin dashboard and internal password/PIN flow  
\- Launch pilot trials with early users  
\- Scale content and begin full marketing campaign

Slogan: "Not just reading — understanding begins here."