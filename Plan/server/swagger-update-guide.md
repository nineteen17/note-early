# Guide to Updating Swagger Documentation in NoteEarly

This guide explains how the Swagger documentation in NoteEarly is implemented and how to make updates to it when needed.

## Overview of the Current Implementation

NoteEarly uses a hybrid approach to Swagger documentation, combining:

1. **Zod schema conversion** with `@asteasolutions/zod-to-openapi` for data models
2. **Manual JSDoc annotations** for route documentation
3. **Central configuration** in `swagger.zod.ts`

## Key Files

- **`/server/src/config/swagger.zod.ts`**: The main configuration file that sets up the OpenAPI registry and imports all schemas
- **`/server/src/modules/*/schemas/*.schema.ts`**: Module-specific schema files that define Zod validation schemas
- **`/server/src/modules/*/routes/*.routes.ts`**: Route files with JSDoc comments for Swagger documentation

## How to Update Schemas

### 1. Update or Create Zod Schemas

To add or update a data model:

```typescript
// In the appropriate schema file (e.g., /server/src/modules/users/schemas/user.schema.ts)
import { z } from "zod";

export const newFeatureSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
});
```

### 2. Register the Schema in swagger.zod.ts

Import and register your schema in the OpenAPI registry:

```typescript
// In /server/src/config/swagger.zod.ts
import * as YourModuleSchema from "../modules/your-module/schemas/your-module.schema";

// ...existing imports...

// In the registry.register section:
registry.register("NewFeatureSchema", YourModuleSchema.newFeatureSchema);
```

### 3. Add Manual Schema Definitions if Needed

For response DTOs or more complex schemas, you might need to add them manually in the `manualSchemas` object:

```typescript
// In /server/src/config/swagger.zod.ts
const manualSchemas = {
  // ...existing schemas...

  NewFeatureDTO: {
    description: "Data Transfer Object for New Feature",
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      isActive: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "createdAt"],
  },
};
```

## How to Update Route Documentation

To document new routes or update existing ones, add or modify the JSDoc comments in the route files:

```typescript
/**
 * @swagger
 * /your-module/your-endpoint:
 *   get:
 *     tags: [Your Module]
 *     summary: Brief description of what this endpoint does
 *     description: Detailed explanation of the endpoint's functionality
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         description: Optional filter parameter
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NewFeatureDTO'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/your-endpoint", yourController.getYourEndpoint);
```

### Important Route Documentation Notes:

1. **Path Format**: Do not include `/api/v1` in the route path - it's added automatically.
2. **Schema References**: Use `$ref: '#/components/schemas/YourSchema'` to reference schemas.
3. **Tags**: Group related endpoints with consistent tags.
4. **Security**: Include the `security` section for protected routes.

## Common Changes

### Adding a New Module

1. Create schema files in `/server/src/modules/your-module/schemas/`
2. Update `swagger.zod.ts` to import and register the schemas
3. Add JSDoc comments to route files

### Updating Existing Endpoints

1. Find the relevant route file
2. Update the JSDoc comment with new parameters, responses, etc.
3. Restart the server to see changes

### Modifying Data Models

1. Update the Zod schema in the schema file
2. If the schema is used in manual definitions, update those as well
3. Restart the server to see changes

## Testing Your Changes

After making changes:

1. Restart the server with `npm run dev`
2. Navigate to `/api-docs` in your browser
3. Verify that your changes appear correctly
4. Test the interactive documentation to ensure it works as expected

## Troubleshooting

### Schema Not Appearing

- Check that it's properly imported and registered in `swagger.zod.ts`
- Verify the schema is properly defined with Zod
- Check for console errors during server startup

### Route Not Appearing

- Ensure JSDoc comment is correctly formatted
- Check that the path doesn't include `/api/v1`
- Verify the route is actually mounted in the application

### Incorrect Schema Properties

- Check the Zod schema definition
- Verify manual schema definitions match the actual data model
- Ensure required fields are properly marked

## Best Practices

1. **Consistency**: Use consistent naming and formatting in documentation
2. **Complete Documentation**: Document all parameters, responses, and possible error codes
3. **Schema Reuse**: Reference shared schemas with `$ref` rather than duplicating definitions
4. **Examples**: Provide example values for complex schemas
5. **Regular Updates**: Keep documentation in sync with code changes

## Generating Client SDKs

If you need to generate client SDKs from the Swagger documentation:

1. Access the `/api-docs` endpoint
2. Click the "Download" button to get the OpenAPI specification as JSON
3. Use tools like OpenAPI Generator to create client libraries

Remember to restart the server after making changes to see them reflected in the Swagger UI.
