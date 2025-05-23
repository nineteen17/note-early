import { Request, Response, NextFunction } from 'express';
import { ReadingModuleService, CreateModuleInput, UpdateModuleInput, NewVocabularyInput } from '../services/reading.service';
import { db } from '@/db'; // Import db instance to inject into the service
import { AppError } from '@/utils/errors';
import { z } from 'zod';
import { ReadingLevel, ModuleType, ReadingModule as ReadingModuleDTO, Paragraph, Language, VocabularyEntry } from '@shared/types'; // Import DTO
import { ReadingModule as DbReadingModule, Vocabulary as DbVocabulary } from '@/db/schema'; // Import DB type alias
import { logger } from '@/utils/logger'; // Added logger

// Instantiate the service with the database connection
const readingModuleService = new ReadingModuleService(db);

// Define allowed genres for the NEW genre column
const allowedGenres = ['History', 'Adventure', 'Science', 'Non-Fiction', 'Fantasy', 'Biography', 'Mystery', 'Science-Fiction', 'Folktale', 'Custom'] as const;
export const GenreEnum = z.enum(allowedGenres);
export const LanguageEnum = z.enum(['UK', 'US']);
export type Genre = z.infer<typeof GenreEnum>;

// --- Input Validation Schemas (using Zod) ---
// Consider placing these in a separate validation file if they grow

// Schema for a single paragraph object within structuredContent
export const ParagraphSchema = z.object({
  index: z.number().int().positive(),
  text: z.string().min(1).max(5000, 'Paragraph text cannot exceed 5000 characters'),
});

// Schema for creating CUSTOM modules
export const CreateModuleSchema = z.object({
  title: z.string().min(1).max(255, 'Title cannot exceed 255 characters'),
  structuredContent: z.array(ParagraphSchema).min(1).max(40, 'A module cannot have more than 40 paragraphs'),
  level: z.nativeEnum(ReadingLevel),
  genre: GenreEnum, // Validate the new genre field
  language: LanguageEnum, // Validate the new language field
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional().nullable(),
  imageUrl: z.string().url('Invalid URL format').max(2048, 'Image URL cannot exceed 2048 characters').optional().nullable(),
  estimatedReadingTime: z.number().int().positive('Estimated reading time must be positive').max(1440, 'Estimated time cannot exceed 24 hours (1440 minutes)').optional().nullable(),
  isActive: z.boolean().optional(),
});

// Schema for updating modules
export const UpdateModuleSchema = z.object({
  title: z.string().min(1).max(255, 'Title cannot exceed 255 characters').optional(),
  structuredContent: z.array(ParagraphSchema).min(1).max(40, 'A module cannot have more than 40 paragraphs').optional(),
  level: z.nativeEnum(ReadingLevel).optional(),
  genre: GenreEnum.optional(), // Allow updating genre
  language: LanguageEnum.optional(), // Allow updating language
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').nullable().optional(),
  imageUrl: z.string().url('Invalid URL format').max(2048, 'Image URL cannot exceed 2048 characters').nullable().optional(),
  estimatedReadingTime: z.number().int().positive('Estimated reading time must be positive').max(1440, 'Estimated time cannot exceed 24 hours (1440 minutes)').nullable().optional(),
  isActive: z.boolean().optional(),
}).partial().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
});

export const IdParamSchema = z.object({
  id: z.string().uuid(),
});

// NEW: Schema for module ID param
export const ModuleIdParamSchema = z.object({
  moduleId: z.string().uuid('Invalid Module ID format'),
});

// New schema for getting a specific paragraph
export const ParagraphParamsSchema = z.object({
  moduleId: z.string().uuid(),
  paragraphIndex: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0),
});

// Schema specifically for curated modules created by super admins
export const CreateCuratedModuleSchema = z.object({
  title: z.string().min(1).max(255, 'Title cannot exceed 255 characters'),
  structuredContent: z.array(ParagraphSchema).min(1).max(40, 'A module cannot have more than 40 paragraphs'),
  level: z.nativeEnum(ReadingLevel),
  genre: GenreEnum, // Validate the new genre field
  language: LanguageEnum, // Validate the new language field
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional().nullable(),
  imageUrl: z.string().url('Invalid URL format').max(2048, 'Image URL cannot exceed 2048 characters').optional().nullable(),
  estimatedReadingTime: z.number().int().positive('Estimated reading time must be positive').max(1440, 'Estimated time cannot exceed 24 hours (1440 minutes)').optional().nullable(),
  isActive: z.boolean().optional(),
});

// --- NEW: Vocabulary Validation Schemas ---
const VocabularyIdParamSchema = z.object({
  vocabularyId: z.string().uuid('Invalid Vocabulary ID format')
});

const VocabularyBodySchema = z.object({
  paragraphIndex: z.number().int().positive('Paragraph index must be a positive integer'),
  word: z.string().min(1, 'Word cannot be empty').max(100, 'Word cannot exceed 100 characters'),
  description: z.string().min(1, 'Description cannot be empty').max(1000, 'Description cannot exceed 1000 characters'),
});

const UpdateVocabularyBodySchema = VocabularyBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field (paragraphIndex, word, description) must be provided for update' }
);

const GetVocabularyForParagraphParamsSchema = z.object({
  moduleId: z.string().uuid('Invalid Module ID format'),
  paragraphIndex: z.string().regex(/^\d+$/, 'Paragraph index must be a positive integer string').transform(Number).refine(val => val > 0, 'Paragraph index must be positive'),
});

// --- Utility Function for DTO mapping ---
function mapToReadingModuleDTO(module: DbReadingModule): ReadingModuleDTO {
  return {
    id: module.id,
    adminId: module.adminId ?? undefined,
    title: module.title,
    paragraphCount: module.paragraphCount,
    structuredContent: module.structuredContent as Paragraph[],
    level: module.level,
    type: module.type as "custom" | "curated",
    genre: module.genre as Genre,
    language: module.language as Language,
    createdAt: module.createdAt,
    authorFirstName: module.authorFirstName ?? null,
    authorLastName: module.authorLastName ?? null,
  };
}

// NEW: Map DB Vocabulary to VocabularyEntry DTO
function mapToVocabularyEntryDTO(vocab: DbVocabulary): VocabularyEntry {
  return {
    id: vocab.id,
    moduleId: vocab.moduleId,
    paragraphIndex: vocab.paragraphIndex,
    word: vocab.word,
    description: vocab.description,
    // Add createdAt/updatedAt if included in VocabularyEntry DTO and DB type
  };
}

// --- Controller Class Definition ---
export class ReadingModuleController {

    // --- Controller Methods (previously exported functions) ---

    async createReadingModule(req: Request, res: Response, next: NextFunction) {
      try {
        // Validate input using the updated schema (includes genre and language)
        const validatedInput = CreateModuleSchema.parse(req.body);

        // Prepare input for the service, including adminId, genre and language
        // Explicitly set type to CUSTOM
        const input: CreateModuleInput = {
            ...validatedInput,
            language: validatedInput.language as Language, // Cast from string literal
            adminId: req.user?.id,
            type: ModuleType.CUSTOM // Set type programmatically
        };

        // Check if adminId was set (user must be authenticated)
        if (!input.adminId) {
             return next(new AppError('Authentication required to create custom modules.', 401));
        }

        const newDbModule = await readingModuleService.createModule(input);
        // Use the updated DTO mapping
        const moduleDTO = mapToReadingModuleDTO(newDbModule);
        
        // --- FIX: Wrap response in standard structure ---
        res.status(201).json({ 
            status: 'success', 
            data: moduleDTO 
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Zod Validation Errors (createReadingModule):", error.errors);
            // --- FIX: Ensure error responses also match a potential standard error structure if apiClient expects it ---
            // Assuming a standard { status: 'error', message: '...' }
            return res.status(400).json({ 
                status: 'error',
                message: 'Validation Error: ' + error.errors.map(e => e.message).join(', ') 
            }); 
            // Original: return next(new AppError(...)); - This might bypass standard JSON error response handling
        }
        // --- FIX: Handle other errors similarly if needed ---
        // Potentially send a standard JSON error response for other errors too
        console.error("Error in createReadingModule:", error);
        res.status(500).json({ status: 'error', message: 'Internal server error during module creation.' });
        // Original: next(error); - Passes to Express error handler, might not send JSON
      }
    }

    async getReadingModuleById(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = IdParamSchema.parse(req.params);
        const dbModule = await readingModuleService.getModuleById(id);
        if (!dbModule) {
          return next(new AppError('Module not found.', 404));
        }
        const moduleDTO = mapToReadingModuleDTO(dbModule);
        res.status(200).json({
          status: 'success',
          data: moduleDTO
        });
      } catch (error) {
         if (error instanceof z.ZodError) {
            // Log the detailed Zod errors for debugging if needed
            // console.error("Zod Validation Errors:", error.errors);
            return next(new AppError('Invalid ID format', 400));
        }
        next(error);
      }
    }

    async getAllActiveReadingModules(req: Request, res: Response, next: NextFunction) {
      try {
        // TODO: Add query param parsing for filtering/pagination if needed
        const requestingUserId = req.user?.id;
        
        // If user is authenticated, pass their ID to get modules based on their subscription
        // Otherwise, return only publicly available modules for non-authenticated users
        const dbModules = requestingUserId 
          ? await readingModuleService.getActiveModules(requestingUserId)
          : await readingModuleService.getActiveModules();
          
        const moduleDTOs = dbModules.map(mapToReadingModuleDTO);

        res.status(200).json({
          status: 'success', 
          data: moduleDTOs 
        });
      } catch (error) {
        next(error);
      }
    }

    async getAdminReadingModules(req: Request, res: Response, next: NextFunction) {
      try {
        // Assuming the admin ID comes from the authenticated user
        const adminId = req.user?.id;
        if (!adminId) {
            return next(new AppError('Authentication required to view admin modules.', 401));
        }
        // Or potentially read from req.params if viewing *another* admin's modules (requires different auth check)
        // const { adminId } = req.params;
        
        const dbModules = await readingModuleService.getModulesByAdmin(adminId);
        const moduleDTOs = dbModules.map(mapToReadingModuleDTO);
        res.status(200).json({ 
          status: 'success', 
          data: moduleDTOs 
      });
      } catch (error) {
        next(error);
      }
    }

    async updateReadingModule(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = IdParamSchema.parse(req.params);
        // Validate updates using the updated schema (includes optional genre and language)
        const validatedUpdates = UpdateModuleSchema.parse(req.body);
        const requestingUserId = req.user?.id;

        if (!requestingUserId) {
            return next(new AppError('Authentication required to update modules.', 401));
        }

        // --- FIX: Cast language to Language enum for type safety ---
        const updates: UpdateModuleInput = {
            ...validatedUpdates,
            language: validatedUpdates.language ? validatedUpdates.language as Language : undefined,
        };

        // Service method now handles checking for empty updates internally
        const updatedDbModule = await readingModuleService.updateModule(id, updates, requestingUserId);
        // Use the updated DTO mapping
        const moduleDTO = mapToReadingModuleDTO(updatedDbModule);
        res.status(200).json(moduleDTO);
      } catch (error) {
         if (error instanceof z.ZodError) {
            console.error("Zod Validation Errors (updateReadingModule):", error.errors);
            return next(new AppError('Validation Error: ' + error.errors.map(e => e.message).join(', '), 400));
        }
        next(error);
      }
    }

    async deleteReadingModule(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = IdParamSchema.parse(req.params);
        const requestingUserId = req.user?.id;

         if (!requestingUserId) {
            return next(new AppError('Authentication required to delete modules.', 401));
        }

        await readingModuleService.deleteModule(id, requestingUserId);
        res.status(204).send(); // No content on successful delete
      } catch (error) {
        if (error instanceof z.ZodError) {
            // Log the detailed Zod errors for debugging if needed
            // console.error("Zod Validation Errors:", error.errors);
            return next(new AppError('Invalid ID format', 400));
        }
        next(error);
      }
    } 

    // Create a curated module (available only to super admins)
    async createCuratedModule(req: Request, res: Response, next: NextFunction) {
      try {
        // Validate input using the updated schema for curated modules (includes genre and language)
        const curatedData = CreateCuratedModuleSchema.parse(req.body);

        // Prepare input for the service (includes genre and language)
        // Explicitly set type to CURATED
        const input: CreateModuleInput = {
          ...curatedData,
          language: curatedData.language as Language, // Cast from string literal
          adminId: null,
          type: ModuleType.CURATED // Set type programmatically
        };

        // Authentication/Authorization is handled by middleware before this point

        const newDbModule = await readingModuleService.createModule(input);
        // Use the updated DTO mapping
        const moduleDTO = mapToReadingModuleDTO(newDbModule);

        res.status(201).json({
          message: "Curated module created successfully",
          module: moduleDTO
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("Validation errors (createCuratedModule):", error.errors);
           return next(new AppError('Validation Error: ' + error.errors.map(e => e.message).join(', '), 400));
        }
        next(error); // Pass other errors to the global error handler
      }
    } 

    // --- Super Admin Specific Methods ---

    async superAdminUpdateReadingModule(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = IdParamSchema.parse(req.params);
        // Validate updates (includes optional genre and language)
        const validatedUpdates = UpdateModuleSchema.parse(req.body);

        // --- FIX: Cast language to Language enum for type safety ---
        const updates: UpdateModuleInput = {
            ...validatedUpdates,
            language: validatedUpdates.language ? validatedUpdates.language as Language : undefined,
        };

        // No requestingUserId needed for super admin update (handled by middleware)
        // Service method should allow updating any module by ID
        const updatedDbModule = await readingModuleService.superAdminUpdateModule(id, updates);
        const moduleDTO = mapToReadingModuleDTO(updatedDbModule);
        res.status(200).json(moduleDTO);
      } catch (error) {
         if (error instanceof z.ZodError) {
            // Log the detailed Zod errors for debugging if needed
            // console.error("Zod Validation Errors:", error.errors);
            return next(new AppError('Validation Error', 400));
        }
        next(error);
      }
    }

    async superAdminDeleteReadingModule(req: Request, res: Response, next: NextFunction) {
      try {
        // ID comes from URL param
        const { id } = IdParamSchema.parse(req.params);
        // Requesting User ID comes from the authenticateSuperAdmin middleware
        const requestingUserId = req.user?.id;

         if (!requestingUserId) {
            // This should technically not be reachable if middleware is working
           return next(new AppError('Super Admin authentication failed.', 401));
        }

        // Call the existing service method - it handles the Super Admin permission logic internally
        await readingModuleService.deleteModule(id, requestingUserId);
        res.status(204).send(); // No content on successful delete
      } catch (error) {
        if (error instanceof z.ZodError) {
            // Log the detailed Zod errors for debugging if needed
            // console.error("Zod Validation Errors:", error.errors);
            return next(new AppError('Invalid ID format', 400));
        }
        next(error);
      }
    } 

    // --- NEW: Get Specific Paragraph Method ---
    async getModuleParagraph(req: Request, res: Response, next: NextFunction) {
      try {
        const { moduleId, paragraphIndex } = ParagraphParamsSchema.parse(req.params);

        const paragraph = await readingModuleService.getModuleParagraph(moduleId, paragraphIndex);

        if (!paragraph) {
          return next(new AppError('Paragraph not found within the specified module.', 404));
        }

        // Return the paragraph data directly
        res.status(200).json(paragraph);

      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("Zod Validation Errors (getModuleParagraph):", error.errors);
          return next(new AppError('Invalid parameter format: ' + error.errors.map(e => e.message).join(', '), 400));
        }
        next(error);
      }
    } 

    // --- Vocabulary Methods ---

    async createVocabularyEntry(req: Request, res: Response, next: NextFunction) {
      try {
        const { moduleId } = ModuleIdParamSchema.parse(req.params);
        const vocabularyData = VocabularyBodySchema.parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
          return next(new AppError('Authentication required', 401));
        }

        const newDbEntry = await readingModuleService.createVocabularyEntry(moduleId, userId, vocabularyData);
        const entryDTO = mapToVocabularyEntryDTO(newDbEntry);

        res.status(201).json({ status: 'success', data: entryDTO });
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.error('Zod Validation Error (createVocabularyEntry):', error.errors);
          return next(new AppError('Validation Error: ' + error.errors.map(e => e.message).join(', '), 400));
        }
        next(error);
      }
    }

    async updateVocabularyEntry(req: Request, res: Response, next: NextFunction) {
      try {
        const { vocabularyId } = VocabularyIdParamSchema.parse(req.params);
        const updates = UpdateVocabularyBodySchema.parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
          return next(new AppError('Authentication required', 401));
        }

        const updatedDbEntry = await readingModuleService.updateVocabularyEntry(vocabularyId, userId, updates);
        const entryDTO = mapToVocabularyEntryDTO(updatedDbEntry);

        res.status(200).json({ status: 'success', data: entryDTO });
      } catch (error) {
         if (error instanceof z.ZodError) {
          logger.error('Zod Validation Error (updateVocabularyEntry):', error.errors);
          return next(new AppError('Validation Error: ' + error.errors.map(e => e.message).join(', '), 400));
        }
        next(error);
      }
    }

    async deleteVocabularyEntry(req: Request, res: Response, next: NextFunction) {
      try {
        const { vocabularyId } = VocabularyIdParamSchema.parse(req.params);
        const userId = req.user?.id;

        if (!userId) {
          return next(new AppError('Authentication required', 401));
        }

        await readingModuleService.deleteVocabularyEntry(vocabularyId, userId);

        res.status(204).send(); // No content on success
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.error('Zod Validation Error (deleteVocabularyEntry):', error.errors);
          return next(new AppError('Invalid Vocabulary ID format', 400));
        }
        next(error);
      }
    }

    async getModuleVocabulary(req: Request, res: Response, next: NextFunction) {
      try {
        const { moduleId } = ModuleIdParamSchema.parse(req.params);
        // Permission check likely needed here or in service/middleware for admin view
        const dbEntries = await readingModuleService.getVocabularyForModule(moduleId);
        const entryDTOs = dbEntries.map(mapToVocabularyEntryDTO);
        res.status(200).json({ status: 'success', data: entryDTOs });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return next(new AppError('Invalid Module ID format', 400));
        }
        next(error);
      }
    }

    async getParagraphVocabulary(req: Request, res: Response, next: NextFunction) {
      try {
        const { moduleId, paragraphIndex } = GetVocabularyForParagraphParamsSchema.parse(req.params);
        const dbEntries = await readingModuleService.getVocabularyForParagraph(moduleId, paragraphIndex);
        const entryDTOs = dbEntries.map(mapToVocabularyEntryDTO);
        res.status(200).json({ status: 'success', data: entryDTOs });
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.error('Zod Validation Error (getParagraphVocabulary):', error.errors);
          return next(new AppError('Invalid parameter format: ' + error.errors.map(e => e.message).join(', '), 400));
        }
        next(error);
      }
    } 

} 