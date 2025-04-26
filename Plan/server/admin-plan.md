# NoteEarly Admin Plan

## Overview

This document outlines the planned admin features for NoteEarly, including both content management for curated reading modules and analytics capabilities. These features will be implemented in phases, with content management taking priority followed by analytics.

## Admin Types

1. **Super Admin**

   - Full system access
   - Management of curated reading modules
   - Access to all analytics and metrics
   - User management capabilities
   - Subscription plan management

2. **Organization Admin** (for schools/institutions)
   - Access to analytics for their students
   - Custom module creation and management
   - Student progress tracking

## Curated Reading Modules Management

### Module Creation Process

1. **Module Definition**

   - Title and description
   - Reading level assignment
   - Estimated reading time calculation
   - Content entry with rich text formatting
   - Image upload capability
   - Module categorization

2. **Review and Publishing Workflow**

   - Draft state for works in progress // TODO: Implement draft status beyond isActive
   - Preview functionality
   - Internal review process
   - Publishing with versioning // TODO: Implement versioning
   - Active/Inactive status control // Implemented via isActive flag

3. **Module Management**
   - Searching and filtering modules
   - Bulk operations
   - Archiving functionality
   - Version history

### Database Schema for Curated Modules

The reading modules schema is already implemented with the following structure:

```typescript
export const readingModules = pgTable("reading_modules", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  level: ReadingLevel("level").notNull(),
  type: ModuleType("type").notNull(),
  adminId: uuid("admin_id").references(() => profiles.id),
  description: text("description"),
  imageUrl: text("image_url"),
  estimatedReadingTime: integer("estimated_reading_time"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

The schema distinguishes between curated modules (system-provided) and custom modules (user-created) using the `type` field and `ModuleType` enum.

### Admin Interface Implementation

1. **Module Editor**

   - Rich text editor with formatting options
   - Image embedding capability
   - Reading level selection
   - Category assignment
   - Status controls
   - Autosaving functionality

2. **Module Library**

   - Grid and list views
   - Filtering by reading level, status, date
   - Search functionality
   - Bulk operations
   - Usage statistics display

3. **Module Analytics Dashboard**
   - Completion rates
   - Average reading times
   - Student performance metrics
   - Engagement metrics

### Implementation Timeline for Curated Content

1. **Phase 1: Core Module Management**

   - Basic CRUD operations for curated modules
   - Reading level assignment
   - Active/Inactive status management

2. **Phase 2: Enhanced Content Creation**

   - Rich text editor integration
   - Image upload capabilities
   - Preview functionality
   - Version history

3. **Phase 3: Enhanced Content Management** // TODO: Deferring advanced features

   - Advanced editing capabilities
   - Content versioning // TODO: Deferring
   - Content organization and categorization // TODO: Deferring

4. **Phase 4: Basic Analytics**

   - Usage tracking
   - Performance metrics
   - Module optimization recommendations

## Detailed Implementation of Reading Modules

### Current Schema Structure

The reading modules schema already has a solid foundation:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, sql, type InferModel } from "drizzle-orm";
import { profiles } from "./profiles";
import { studentProgress } from "./student-progress";
import { ReadingLevel } from "@shared/types";

// Reading module type enum
export const moduleTypeEnum = pgEnum("module_type", ["curated", "custom"]);

// Define reading module schema type
export type ReadingModule = InferModel<typeof readingModules>;

// Reading modules table
export const readingModules = pgTable("reading_modules", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  level: integer("level").$type<ReadingLevel>().notNull(),
  type: moduleTypeEnum("type").notNull(),

  // Only for custom modules
  adminId: uuid("admin_id").references(() => profiles.id),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),

  // Optional fields
  description: text("description"),
  imageUrl: text("image_url"),
  estimatedReadingTime: integer("estimated_reading_time"), // in minutes
});

// Define relationships
export const readingModulesRelations = relations(
  readingModules,
  ({ one, many }) => ({
    // Relation to admin who created the custom module
    admin: one(profiles, {
      fields: [readingModules.adminId],
      references: [profiles.id],
    }),

    // Relation to student progress records for this module
    progress: many(studentProgress),
  })
);
```

### Implementation Strategy

#### 1. Creating Curated Modules (Admin-Created)

Curated modules are system content created by super admins:

```typescript
// In your admin module service
async function createCuratedModule(adminUser, moduleData) {
  // Verify the user is a super admin
  if (!adminUser.isSuperAdmin) {
    throw new Error("Only super admins can create curated modules");
  }

  return db
    .insert(readingModules)
    .values({
      title: moduleData.title,
      content: moduleData.content,
      level: moduleData.level,
      type: "curated", // Key distinction - marked as curated
      adminId: null, // No specific admin ownership since it's system content
      description: moduleData.description,
      imageUrl: moduleData.imageUrl,
      estimatedReadingTime: moduleData.estimatedReadingTime,
      isActive: true,
    })
    .returning();
}
```

#### 2. Creating Custom Modules (User-Generated)

Custom modules are created by users with appropriate subscription tiers:

```typescript
// In your user module service
async function createCustomModule(user, moduleData) {
  // Check subscription tier allows custom modules
  const subscription = await getSubscription(user.id);
  if (subscription.tier === "free") {
    throw new Error("Free tier cannot create custom modules");
  }

  // Check if user has reached their limit
  const currentCount = await db
    .select({ count: count() })
    .from(readingModules)
    .where(
      and(
        eq(readingModules.adminId, user.id),
        eq(readingModules.type, "custom")
      )
    );

  if (currentCount[0].count >= subscription.customModuleLimit) {
    throw new Error("Custom module limit reached");
  }

  return db
    .insert(readingModules)
    .values({
      title: moduleData.title,
      content: moduleData.content,
      level: moduleData.level,
      type: "custom", // Key distinction - marked as custom
      adminId: user.id, // Critical - links to the creating user
      description: moduleData.description,
      imageUrl: moduleData.imageUrl,
      estimatedReadingTime: moduleData.estimatedReadingTime,
      isActive: true,
    })
    .returning();
}
```

#### 3. Querying Modules

For users to see modules they have access to:

```typescript
async function getAccessibleModules(userId) {
  const { plan } = await subscriptionService.getCurrentSubscription(userId);

  // Base query - always include curated modules
  const baseQuery = db
    .select()
    .from(readingModules)
    .where(eq(readingModules.isActive, true));

  if (plan.tier === "free") {
    // Free tier only sees curated content with limits
    return baseQuery.where(eq(readingModules.type, "curated")).limit(5); // Based on your free tier limit
  } else {
    // Paid tiers see curated content + their own custom content
    return baseQuery.where(
      or(
        eq(readingModules.type, "curated"),
        and(
          eq(readingModules.type, "custom"),
          eq(readingModules.adminId, userId)
        )
      )
    );
  }
}
```

#### 4. Admin Management of Modules

For super admins who need to manage all modules:

```typescript
async function getAllModulesForAdmin() {
  return db
    .select()
    .from(readingModules)
    .orderBy(desc(readingModules.updatedAt));
}

async function getCuratedModulesForAdmin() {
  return db
    .select()
    .from(readingModules)
    .where(eq(readingModules.type, "curated"))
    .orderBy(desc(readingModules.updatedAt));
}

async function getCustomModulesForAdmin() {
  return db
    .select({
      ...readingModules,
      adminName: profiles.name,
    })
    .from(readingModules)
    .leftJoin(profiles, eq(readingModules.adminId, profiles.id))
    .where(eq(readingModules.type, "custom"))
    .orderBy(desc(readingModules.updatedAt));
}
```

#### 5. Permissions for Module Updates/Deletions

```typescript
async function updateModule(moduleId, updates, requestingUserId) {
  // First check ownership/permissions
  const module = await db
    .select()
    .from(readingModules)
    .where(eq(readingModules.id, moduleId))
    .limit(1);

  if (!module.length) {
    throw new Error("Module not found");
  }

  const [existingModule] = module;

  // Super admin can edit any module
  const isSuperAdmin = await checkSuperAdminStatus(requestingUserId);

  // Regular users can only edit their own custom modules
  if (
    !isSuperAdmin &&
    (existingModule.type === "curated" ||
      existingModule.adminId !== requestingUserId)
  ) {
    throw new Error("Not authorized to edit this module");
  }

  // Perform update with permission
  return db
    .update(readingModules)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(readingModules.id, moduleId))
    .returning();
}

async function deleteModule(moduleId, requestingUserId) {
  // Similar permission check as update
  const module = await db
    .select()
    .from(readingModules)
    .where(eq(readingModules.id, moduleId))
    .limit(1);

  if (!module.length) {
    throw new Error("Module not found");
  }

  const [existingModule] = module;
  const isSuperAdmin = await checkSuperAdminStatus(requestingUserId);

  if (
    !isSuperAdmin &&
    (existingModule.type === "curated" ||
      existingModule.adminId !== requestingUserId)
  ) {
    throw new Error("Not authorized to delete this module");
  }

  // Consider using soft delete by updating isActive flag instead of hard delete
  return db
    .update(readingModules)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(readingModules.id, moduleId))
    .returning();
}
```

#### 6. Tracking Module Usage and Analytics

```typescript
async function trackModuleProgress(userId, moduleId, progress) {
  // Log when a user interacts with a module
  return db
    .insert(studentProgress)
    .values({
      userId,
      moduleId,
      progressPercentage: progress.percentage,
      timeSpentMinutes: progress.timeSpent,
      lastActivityAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [studentProgress.userId, studentProgress.moduleId],
      set: {
        progressPercentage: progress.percentage,
        timeSpentMinutes: sql`${studentProgress.timeSpentMinutes} + ${progress.timeSpent}`,
        lastActivityAt: new Date(),
      },
    });
}

async function getModuleCompletionStats(moduleId) {
  // Calculate stats for a specific module
  const stats = await db
    .select({
      totalStudents: count(),
      avgCompletionRate: avg(studentProgress.progressPercentage),
      avgTimeSpent: avg(studentProgress.timeSpentMinutes),
    })
    .from(studentProgress)
    .where(eq(studentProgress.moduleId, moduleId));

  return stats[0];
}
```

## Analytics Capabilities

### User Metrics

- Total users (growth over time)
- User breakdown by tier (Free, Home, Pro)
- Active users (daily/weekly/monthly)
- User retention rates
- User engagement levels
- Session duration and frequency

### Content Metrics

- Most/least popular modules
- Module completion rates
- Average time spent per module
- Module difficulty analysis (based on completion time)
- Content engagement by reading level

### Financial Metrics

- Revenue (daily/weekly/monthly/annual)
- Revenue by tier
- Conversion rates (Free → Home, Home → Pro)
- Churn rates
- Customer lifetime value (CLV)
- Payment failures/successes

### Educational Metrics

- Student progress by reading level
- Reading improvement over time
- Challenge areas identification
- Time spent reading
- Completion rates by demographic

## Implementation Approaches for Analytics

### 1. On-demand Analytics (Initial Approach)

For the initial implementation, analytics can be calculated on-demand by querying existing tables:

```typescript
// Example query for user growth
const userGrowth = await db
  .select({
    date: sql`date_trunc('day', ${profiles.createdAt})::date`,
    count: count(),
  })
  .from(profiles)
  .groupBy(sql`date_trunc('day', ${profiles.createdAt})::date`)
  .orderBy(sql`date_trunc('day', ${profiles.createdAt})::date`);
```

### 2. Analytics Snapshots Table (Future Optimization)

As the application scales, we can implement an analytics snapshot table that stores pre-computed metrics at regular intervals:

```typescript
export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: timestamp("date").notNull(),
  totalUsers: integer("total_users").notNull(),
  activeUsers: integer("active_users").notNull(),
  freeUsers: integer("free_users").notNull(),
  homeUsers: integer("home_users").notNull(),
  proUsers: integer("pro_users").notNull(),
  totalModules: integer("total_modules").notNull(),
  avgCompletionRate: numeric("avg_completion_rate", { precision: 5, scale: 2 }),
  totalRevenue: numeric("total_revenue", { precision: 10, scale: 2 }),
  newSubscriptions: integer("new_subscriptions").notNull(),
  churnedSubscriptions: integer("churned_subscriptions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

A scheduled job would run daily to calculate these metrics and insert a new record, enabling:

- Fast dashboard rendering
- Historical trend analysis
- Reduced database load during dashboard viewing

### 3. Event-based Analytics (Future Enhancement)

For more sophisticated analytics, we could implement an event-based system:

```typescript
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => profiles.id),
  eventType: text("event_type").notNull(), // e.g., 'module_started', 'module_completed'
  eventData: jsonb("event_data"), // flexible structure for different event types
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
```

This approach enables:

- User journey tracking
- Funnel analysis
- Custom event tracking
- More granular analytics

## Admin Dashboard Components

The admin dashboard will include:

1. **Overview Dashboard**

   - Key metrics at a glance
   - Recent activity
   - Alerts for unusual patterns

2. **User Management**

   - User search and filtering
   - User profile viewing
   - User tier adjustment

3. **Content Management**

   - Module creation and editing
   - Module performance metrics
   - Content categorization

4. **Financial Overview**

   - Revenue tracking
   - Subscription management
   - Payment processing monitoring

5. **Reports**
   - Customizable report generation
   - Export capabilities (CSV, PDF)
   - Scheduled report delivery

## Technology Recommendations

1. **Content Management**

   - Draft.js or TipTap for rich text editing
   - Cloudinary or similar for image storage
   - React Query for data fetching and caching

2. **Analytics Visualization**
   - Chart.js or Recharts for React
   - Data Processing: Server-side aggregation with caching
   - Export Functionality: PDFKit for PDF generation, csv-writer for CSV exports
   - Real-time Updates: Optional WebSocket implementation for live dashboard updates

## Complete Implementation Timeline

1. **Phase 1: Core Module Experience and Content Creation**

   - Basic reading module implementation
   - Admin interface for curated content management
   - Initial user access controls

2. **Phase 2: User and Subscription Management**

   - User authentication and profile management
   - Subscription and payment processing
   - Custom module creation for paid users

3. **Phase 3: Enhanced Content Management** // TODO: Deferring advanced features

   - Advanced editing capabilities
   - Content versioning // TODO: Deferring
   - Content organization and categorization // TODO: Deferring

4. **Phase 4: Basic Analytics**

   - On-demand analytics queries
   - Basic dashboard implementation
   - Core performance metrics

5. **Phase 5: Advanced Analytics**
   - Analytics snapshots
   - Event tracking
   - Custom reports and exports

## Conclusion

The admin capabilities will provide comprehensive tools for both content management and business intelligence. By implementing these features in phases, we can deliver value incrementally while ensuring the application scales effectively with growth.

## Creating a Super Admin User

Super Admin users have full system access and are created directly in the database for security reasons rather than through the application API. This prevents potential privilege escalation attacks.

### Process for Creating a Super Admin

1. **Create a regular user account first**

   - Have the user sign up through the normal Supabase authentication flow
   - This creates a user entry in Supabase Auth and a corresponding profile in our database

2. **Use Supabase Dashboard to elevate privileges**

   - Log in to the Supabase dashboard
   - Navigate to the "Table Editor" in the sidebar
   - Select the "profiles" table
   - Find the user record (filter by email)
   - Click "Edit" and change the "role" value to "SUPER_ADMIN"
   - Save the changes

3. **Alternative: Direct SQL method**

   - Connect to the database using the SQL Editor in Supabase
   - Run the following SQL (replacing the email with the target user's email):
     ```sql
     UPDATE profiles
     SET role = 'SUPER_ADMIN'
     WHERE email = 'user@example.com';
     ```

4. **Verification**
   - Have the user log in to the application
   - They should now have access to all super admin features including:
     - Analytics dashboards
     - Curated content management
     - System-wide user management
     - Subscription plan management

This approach ensures that Super Admin creation requires database-level access, creating an additional security layer for this privileged role.
