import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { env } from './env';
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod'; // Import Zod itself
import { OpenAPIV3 } from 'openapi-types'; // Import the namespaceZ

// --- Import your Zod Schemas ---
// NOTE: Adjust paths if schemas are moved or located elsewhere
import * as AuthSchema from '../modules/auth/schemas/auth.schema';
// Assuming Reading schemas are exported from controller for now:
import { CreateModuleSchema, UpdateModuleSchema, CreateCuratedModuleSchema, IdParamSchema } from '../modules/reading-modules/controllers/reading.controller';
// Import Progress schemas
import * as ProgressSchema from '../modules/progress/schemas/progress.schema';
// Update User schemas import path and alias
import * as ProfileSchema from '../modules/profiles/schemas/profile.schema';
// TODO: Import Subscription modules

// --- Define other non-Zod derived Schemas (like DTOs, if needed) ---
// You might still need manual definitions for response DTOs if they don't have corresponding Zod schemas
const manualSchemas = {
    // Example: If ReadingModuleDTO doesn't have a Zod schema
    ReadingModuleDTO: {
       description: "Data Transfer Object for Reading Modules",
       type: 'object',
       properties: {
            id: { type: 'string', format: 'uuid' },
            adminId: { type: 'string', format: 'uuid', nullable: true },
            title: { type: 'string' },
            structuredContent: { type: 'array', items: { $ref: '#/components/schemas/Paragraph' } },
            paragraphCount: { type: 'integer' },
            level: { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
            type: { type: 'string', enum: ['curated', 'custom'] },
            genre: { type: 'string', enum: ['History', 'Adventure', 'Science', 'Non-Fiction', 'Fantasy', 'Biography', 'Mystery', 'Science-Fiction', 'Folktale', 'Custom'] },
            language: { type: 'string', enum: ['UK', 'US'] },
            createdAt: { type: 'string', format: 'date-time' },
            description: { type: 'string', nullable: true },
            imageUrl: { type: 'string', format: 'url', nullable: true },
            estimatedReadingTime: { type: 'integer', format: 'int32', nullable: true },
       },
        required: ['id', 'title', 'structuredContent', 'paragraphCount', 'level', 'type', 'genre', 'language', 'createdAt']
    },
    SubscriptionPlan: {
         description: "Details of an available subscription plan",
         type: 'object',
         properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            price: { type: 'string' }, // Match schema definition
            interval: { type: 'string', enum: ['month', 'year'] },
            tier: { type: 'string', enum: ['free', 'home', 'pro'] },
            studentLimit: { type: 'integer', format: 'int32' },
            moduleLimit: { type: 'integer', format: 'int32', description: "Limit for accessing curated modules" },
            customModuleLimit: { type: 'integer', format: 'int32' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
    },
    ErrorResponse: {
       type: 'object',
       properties: {
         status: { type: 'string', example: 'error' },
         message: { type: 'string' }
       },
       required: ['message']
    },
    // Add other manually defined DTOs or responses here
    SuccessResponse: {
        type: 'object',
        properties: {
            message: { type: 'string' }
        }
    }
};

// --- Setup OpenAPI Registry and Generator ---

const registry = new OpenAPIRegistry();

// Register Zod schemas with the registry
// The .openapi() calls in the schema definitions themselves might add descriptions/examples
registry.register('AdminSignupInput', AuthSchema.adminSignupSchema);
registry.register('AdminLoginInput', AuthSchema.adminLoginSchema);
registry.register('StudentLoginInput', AuthSchema.studentLoginSchema);
registry.register('CreateStudentInput', AuthSchema.createStudentSchema);
registry.register('ResetStudentPinInput', AuthSchema.resetStudentPinSchema);

// Schemas for reading modules - these will now include genre due to the generator
registry.register('CreateModuleInput', CreateModuleSchema);
registry.register('UpdateModuleInput', UpdateModuleSchema);
registry.register('CreateCuratedModuleInput', CreateCuratedModuleSchema);
registry.register('IdParam', IdParamSchema); // For path parameters

// Define Paragraph schema for referencing (if not already generated from Zod)
// Check if ParagraphSchema from controller is registered or define manually
// Assuming ParagraphSchema from controller isn't registered for zod-to-openapi, define it:
registry.register('Paragraph', z.object({
  index: z.number().int().positive(),
  text: z.string().min(1),
}));

// Register Progress schemas
registry.register('UpdateProgressInput', ProgressSchema.updateProgressSchema);
registry.register('StartModuleInput', ProgressSchema.startModuleSchema);
registry.register('SubmitSummaryInput', ProgressSchema.submitSummarySchema);
registry.register('ProgressIdParam', ProgressSchema.progressIdParamSchema);
registry.register('StudentIdParam', ProgressSchema.studentIdParamSchema);
registry.register('ModuleIdParam', ProgressSchema.moduleIdParamSchema);
// --- ADD REGISTRATION for the new schemas --- 
registry.register('AdminUpdateProgressInputSchema', ProgressSchema.AdminUpdateProgressInputSchema);
registry.register('StudentProgressSchema', ProgressSchema.StudentProgressSchema);
registry.register('ParagraphSubmissionSchema', ProgressSchema.ParagraphSubmissionSchema);
registry.register('StudentProgressDetailsDTOSchema', ProgressSchema.StudentProgressDetailsDTOSchema);
// --- END ADDED REGISTRATION ---

// Register Profile schemas using the correct alias and schema names
registry.register('ProfileIdParam', ProfileSchema.profileIdParamSchema);
registry.register('ProfileUpdateRequest', ProfileSchema.ProfileUpdateRequestSchema);
registry.register('AdminUpdateStudentRequest', ProfileSchema.AdminUpdateStudentRequestSchema);
// --- ADD REGISTRATION for the main ProfileDTO schema ---
registry.register('ProfileDTO', ProfileSchema.ProfileSchema);

// --- End Calculation ---

// --- Generate Components --- (Generator used here)
const generator = new OpenApiGeneratorV3(registry.definitions);
const components = generator.generateComponents();

// --- Define Swagger Options --- 
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NoteEarly API Documentation (Zod-Generated)',
      version: '1.0.0',
      description: 'API documentation for the NoteEarly platform (schemas generated from Zod).',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT || 4000}/api/v1`, // Added default port
        description: 'Development server (V1)',
      },
    ],
    components: {
        // Use the generated components
        ...components, 
        // Merge/override with manually defined schemas if necessary (manual takes precedence)
        schemas: {
            ...(components.components?.schemas || {}), // Correct path to generated schemas
            ...Object.entries(manualSchemas)
                .filter(([, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}),
        },
        // Keep existing security schemes
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter JWT token **_only_**',
          },
        },
    },
  },
  // Path to the API docs files (JSDoc comments in routes)
  apis: [
    path.join(__dirname, '../modules/**/routes/*.ts')
  ],
};

// Generate the final specification including route comments
let swaggerSpec: OpenAPIV3.Document; // Use the correct type from the namespace
try {
    // Generate the spec object
    const spec = swaggerJsdoc(swaggerOptions);
    // We need to cast the result of swaggerJsdoc as it returns a generic object
    swaggerSpec = spec as OpenAPIV3.Document;
    console.log("Swagger specification generated successfully.");
} catch (error) {
    console.error("Error generating Swagger specification:", error);
    // Fallback or default spec if generation fails
    swaggerSpec = { // Ensure fallback also matches the OpenAPIV3.Document type
        openapi: '3.0.0',
        info: { title: 'Error Generating Spec', version: '0.0.0', description: 'Specification generation failed' },
        paths: {},
        components: {},
        servers: []
    };
}


// Export the generated specification
export default swaggerSpec;
