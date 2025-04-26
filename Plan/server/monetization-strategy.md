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
