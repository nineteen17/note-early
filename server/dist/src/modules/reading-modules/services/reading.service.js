import * as schema from '@/db/schema';
import { ModuleType, UserRole } from '@shared/types';
import { eq, and, count as drizzleCount, asc, or, desc, sql } from 'drizzle-orm';
import { AppError } from '@/utils/errors';
import { SubscriptionService } from '@/modules/subscription/services/subscription.service';
import { logger } from '@/utils/logger';
export class ReadingModuleService {
    constructor(db) {
        this.db = db;
        this.subscriptionService = new SubscriptionService();
    }
    // --- CREATE --- //
    async createModule(input) {
        // Basic Validation - check structuredContent
        if (!input.title || !input.structuredContent || !input.level || !input.type || !input.genre || !input.language) {
            throw new AppError('Missing required fields for module creation.', 400);
        }
        // Validate structuredContent format
        if (!Array.isArray(input.structuredContent) || input.structuredContent.length === 0) {
            throw new AppError('structuredContent must be a non-empty array.', 400);
        }
        // Calculate paragraphCount
        const paragraphCount = input.structuredContent.length;
        let proceedWithCreation = false; // Flag to control insertion
        let isFreeTierCreation = false; // Flag to skip counter increment if free
        if (input.type === ModuleType.CUSTOM) {
            if (!input.adminId) {
                throw new AppError('Admin ID is required for custom modules.', 400);
            }
            // Fetch plan and subscription status
            const { plan, subscription } = await this.subscriptionService.getCurrentSubscription(input.adminId);
            if (!plan) {
                throw new AppError('Could not determine subscription plan for admin.', 500);
            }
            // --- Tier Specific Logic --- 
            if (plan.tier === 'free') {
                isFreeTierCreation = true; // Mark as free tier
                if (plan.customModuleLimit <= 0) {
                    // Explicitly disallowed by plan config
                    throw new AppError('Custom module creation is not allowed on the Free plan. Please upgrade.', 403);
                }
                else {
                    // Free tier has a limit > 0, check total created modules
                    const existingModuleCountResult = await this.db.select({ value: drizzleCount() })
                        .from(schema.readingModules)
                        .where(and(eq(schema.readingModules.adminId, input.adminId), eq(schema.readingModules.type, ModuleType.CUSTOM)));
                    const existingCount = existingModuleCountResult[0]?.value ?? 0;
                    if (existingCount >= plan.customModuleLimit) {
                        throw new AppError(`Free plan custom module limit (${plan.customModuleLimit} total) has been reached.`, 403);
                    }
                    else {
                        proceedWithCreation = true; // Allow creation
                        logger.info('Free tier user within custom module limit', { adminId: input.adminId, count: existingCount, limit: plan.customModuleLimit });
                    }
                }
            }
            else {
                // Paid Tier Logic (existing logic)
                if (!subscription) {
                    logger.error('Paid plan tier found but no subscription record exists for admin', { adminId: input.adminId, planTier: plan.tier });
                    throw new AppError('Subscription data inconsistent. Cannot verify module limit.', 500);
                }
                if (subscription.customModulesCreatedThisPeriod >= plan.customModuleLimit) {
                    throw new AppError(`Monthly custom module limit (${plan.customModuleLimit}) for your current plan ('${plan.tier}') has been reached. Limit resets on your next billing date.`, 403);
                }
                proceedWithCreation = true; // Allow creation for paid tier within limits
            }
        }
        else if (input.type === ModuleType.CURATED) {
            // Curated modules bypass subscription checks
            proceedWithCreation = true;
        }
        // --- Module Insertion (Conditional) --- 
        if (!proceedWithCreation) {
            // Should not be reachable if logic above is correct, but as a safeguard
            throw new AppError('Module creation prerequisites not met.', 400);
        }
        const moduleData = {
            title: input.title,
            structuredContent: input.structuredContent,
            paragraphCount: paragraphCount,
            level: input.level,
            type: input.type,
            genre: input.genre,
            language: input.language,
            adminId: input.type === ModuleType.CUSTOM ? input.adminId : null,
            description: input.description,
            imageUrl: input.imageUrl,
            estimatedReadingTime: input.estimatedReadingTime,
            isActive: input.isActive !== undefined ? input.isActive : true,
            authorFirstName: input.authorFirstName,
            authorLastName: input.authorLastName,
        };
        try {
            const [newDbModule] = await this.db
                .insert(schema.readingModules)
                .values(moduleData)
                .returning();
            if (!newDbModule) {
                throw new AppError('Failed to create module after insertion attempt.', 500);
            }
            // --- Increment Subscription Counter (if applicable - NOT for free tier) --- 
            if (input.type === ModuleType.CUSTOM && !isFreeTierCreation) {
                // Fetch subscription again to be absolutely sure (or reuse from above if confident)
                const { subscription: currentSubAfterCreate } = await this.subscriptionService.getCurrentSubscription(input.adminId);
                if (currentSubAfterCreate) {
                    await this.db.update(schema.customerSubscriptions)
                        .set({
                        customModulesCreatedThisPeriod: sql `${schema.customerSubscriptions.customModulesCreatedThisPeriod} + 1`
                    })
                        .where(eq(schema.customerSubscriptions.id, currentSubAfterCreate.id));
                    logger.info('Custom module created and monthly count incremented', {
                        moduleId: newDbModule.id,
                        adminId: input.adminId,
                        newCount: (currentSubAfterCreate.customModulesCreatedThisPeriod ?? 0) + 1
                    });
                }
                else {
                    logger.error('Subscription record not found AFTER creating module for paid user - counter not incremented', { adminId: input.adminId });
                }
            }
            return newDbModule;
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            console.error("Error during module creation or counter increment:", { input, error });
            throw new AppError('Database error during module creation process.', 500);
        }
    }
    // --- RETRIEVE --- //
    async getModuleById(id) {
        try {
            const module = await this.db.query.readingModules.findFirst({
                where: eq(schema.readingModules.id, id),
            });
            return module ?? null;
        }
        catch (error) {
            console.error(`Error fetching module ${id}:`, error);
            throw new AppError('Database error fetching module.', 500);
        }
    }
    async getActiveModules(requestingUserId) {
        try {
            if (requestingUserId) {
                const [userProfile] = await this.db
                    .select()
                    .from(schema.profiles)
                    .where(eq(schema.profiles.id, requestingUserId));
                if (!userProfile) {
                    throw new AppError('User profile not found for authenticated user.', 404);
                }
                const { plan } = await this.subscriptionService.getCurrentSubscription(requestingUserId);
                if (!plan) {
                    throw new AppError('Could not determine subscription plan for user.', 500);
                }
                const baseConditions = [eq(schema.readingModules.isActive, true)];
                // For students, we want to show both curated modules AND their admin's custom modules
                if (userProfile.role === UserRole.STUDENT) {
                    if (userProfile.adminId) {
                        // Students with an admin get both curated and their admin's custom modules
                        return await this.db.query.readingModules.findMany({
                            where: and(...baseConditions, or(eq(schema.readingModules.type, ModuleType.CURATED), and(eq(schema.readingModules.type, ModuleType.CUSTOM), eq(schema.readingModules.adminId, userProfile.adminId)))),
                            orderBy: asc(schema.readingModules.createdAt)
                        });
                    }
                    else {
                        // Students without an admin only get curated modules
                        return await this.db.query.readingModules.findMany({
                            where: and(...baseConditions, eq(schema.readingModules.type, ModuleType.CURATED)),
                            limit: 5,
                            orderBy: asc(schema.readingModules.createdAt)
                        });
                    }
                }
                // For admins, show curated modules AND their own custom modules
                if (userProfile.role === UserRole.ADMIN || userProfile.role === UserRole.SUPER_ADMIN) {
                    return await this.db.query.readingModules.findMany({
                        where: and(...baseConditions, or(eq(schema.readingModules.type, ModuleType.CURATED), and(eq(schema.readingModules.type, ModuleType.CUSTOM), eq(schema.readingModules.adminId, requestingUserId)))),
                        orderBy: asc(schema.readingModules.createdAt)
                    });
                }
                // Fallback for any other cases
                return await this.db.query.readingModules.findMany({
                    where: and(...baseConditions, eq(schema.readingModules.type, ModuleType.CURATED)),
                    orderBy: asc(schema.readingModules.createdAt)
                });
            }
            // For non-authenticated users, return only curated modules
            return await this.db.query.readingModules.findMany({
                where: and(eq(schema.readingModules.isActive, true), eq(schema.readingModules.type, ModuleType.CURATED)),
                limit: 3,
                orderBy: asc(schema.readingModules.createdAt)
            });
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            console.error("Error fetching active modules:", { requestingUserId, error });
            throw new AppError('Database error fetching active modules.', 500);
        }
    }
    async getModulesByAdmin(adminId) {
        if (!adminId) {
            throw new AppError('Admin ID is required to fetch modules by admin.', 400);
        }
        try {
            const modules = await this.db.query.readingModules.findMany({
                where: eq(schema.readingModules.adminId, adminId),
                // Optionally filter by isActive as well?
                // where: and(eq(schema.readingModules.adminId, adminId), eq(schema.readingModules.isActive, true))
                // TODO: Add orderBy, limit, offset based on options
            });
            return modules;
        }
        catch (error) {
            console.error(`Error fetching modules for admin ${adminId}:`, error);
            throw new AppError('Database error fetching admin modules.', 500);
        }
    }
    // --- UPDATE --- //
    async updateModule(id, updates, requestingUserId) {
        // 1. Fetch the module first to check existence and ownership
        const existingModule = await this.getModuleById(id);
        if (!existingModule) {
            throw new AppError('Module not found.', 404);
        }
        // 2. Fetch requesting user's role for authorization check
        const requestingUserProfile = await this.db.query.profiles.findFirst({
            columns: { role: true }, // Only need the role
            where: eq(schema.profiles.id, requestingUserId)
        });
        if (!requestingUserProfile) {
            // Handle case where the requesting user doesn't exist (shouldn't happen if auth middleware works)
            throw new AppError('Requesting user profile not found.', 403);
        }
        const isSuperAdmin = requestingUserProfile.role === UserRole.SUPER_ADMIN;
        // 3. Authorization Check
        let authorized = false;
        if (isSuperAdmin) {
            authorized = true; // Super Admin can update any module
        }
        else {
            // Regular admins/users can only update their own custom modules
            if (existingModule.type === ModuleType.CUSTOM && existingModule.adminId === requestingUserId) {
                authorized = true;
            }
        }
        if (!authorized) {
            throw new AppError('Unauthorized to update this module.', 403);
        }
        // 4. Recalculate paragraphCount if structuredContent is being updated
        let updatesWithCount = { ...updates };
        if (updates.structuredContent) {
            if (!Array.isArray(updates.structuredContent) || updates.structuredContent.length === 0) {
                throw new AppError('structuredContent must be a non-empty array when updating.', 400);
            }
            updatesWithCount.paragraphCount = updates.structuredContent.length;
        }
        // Remove potentially harmful fields if not SuperAdmin (e.g., trying to change type/adminId indirectly)
        // Although UpdateModuleInput already restricts this, belt-and-suspenders approach
        if (!isSuperAdmin) {
            delete updatesWithCount.type;
            delete updatesWithCount.adminId;
        }
        // 5. Perform the update
        try {
            const updatedResult = await this.db
                .update(schema.readingModules)
                .set({ ...updatesWithCount, updatedAt: new Date() })
                .where(eq(schema.readingModules.id, id))
                .returning();
            if (updatedResult.length === 0) {
                throw new AppError('Module update failed or module not found after authorization.', 500);
            }
            return updatedResult[0];
        }
        catch (error) {
            console.error(`Error updating module ${id}:`, { updates, error });
            throw new AppError('Database error during module update.', 500);
        }
    }
    // --- NEW: Super Admin Update (less restrictive) --- //
    async superAdminUpdateModule(id, updates) {
        // Fetch the module first to check existence
        const existingModule = await this.getModuleById(id);
        if (!existingModule) {
            throw new AppError('Module not found.', 404);
        }
        // Recalculate paragraphCount if structuredContent is being updated
        let updatesWithCount = { ...updates };
        if (updates.structuredContent) {
            if (!Array.isArray(updates.structuredContent) || updates.structuredContent.length === 0) {
                throw new AppError('structuredContent must be a non-empty array when updating.', 400);
            }
            updatesWithCount.paragraphCount = updates.structuredContent.length;
        }
        // Super Admin can update almost anything (except ID, createdAt)
        // Note: Be cautious if allowing updates to 'type' or 'adminId' - might have implications.
        // Current UpdateModuleInput prevents this, but adding method for clarity.
        try {
            const updatedResult = await this.db
                .update(schema.readingModules)
                .set({ ...updatesWithCount, updatedAt: new Date() })
                .where(eq(schema.readingModules.id, id))
                .returning();
            if (updatedResult.length === 0) {
                throw new AppError('Module update failed.', 500);
            }
            return updatedResult[0];
        }
        catch (error) {
            console.error(`Error (super admin) updating module ${id}:`, { updates, error });
            throw new AppError('Database error during module update.', 500);
        }
    }
    // --- DELETE (Soft) --- //
    async deleteModule(id, requestingUserId) {
        // 1. Fetch the module first to check existence and ownership
        const existingModule = await this.getModuleById(id);
        if (!existingModule) {
            throw new AppError('Module not found.', 404);
        }
        // 2. Fetch requesting user's role for authorization check
        const requestingUserProfile = await this.db.query.profiles.findFirst({
            columns: { role: true }, // Only need the role
            where: eq(schema.profiles.id, requestingUserId)
        });
        if (!requestingUserProfile) {
            throw new AppError('Requesting user profile not found.', 403);
        }
        const isSuperAdmin = requestingUserProfile.role === UserRole.SUPER_ADMIN;
        // 3. Authorization Check
        let authorized = false;
        if (isSuperAdmin) {
            authorized = true; // Super Admin can delete any module
        }
        else {
            // Regular admins/users can only delete their own custom modules
            if (existingModule.type === ModuleType.CUSTOM && existingModule.adminId === requestingUserId) {
                authorized = true;
            }
        }
        if (!authorized) {
            throw new AppError('Forbidden: You do not have permission to delete this module.', 403);
        }
        // 4. Perform Soft Delete (Set isActive to false)
        try {
            const result = await this.db
                .update(schema.readingModules)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(schema.readingModules.id, id))
                .returning();
            if (result.length === 0) {
                // This might happen in a race condition
                throw new AppError('Module not found during deletion.', 404);
            }
            return result[0];
        }
        catch (error) {
            console.error(`Error deleting module ${id}:`, error);
            throw new AppError('Database error during module deletion.', 500);
        }
    }
    // --- ADMIN-SPECIFIC QUERIES --- //
    /**
     * Fetches all modules (active/inactive, curated/custom) for admin views.
     * Orders by most recently updated.
     */
    async getAllModulesForAdmin() {
        try {
            const modules = await this.db.query.readingModules.findMany({
                orderBy: desc(schema.readingModules.updatedAt),
            });
            return modules;
        }
        catch (error) {
            console.error("Error fetching all modules for admin:", error);
            throw new AppError('Database error fetching all admin modules.', 500);
        }
    }
    /**
     * Fetches only curated modules (active/inactive) for admin views.
     * Orders by most recently updated.
     */
    async getCuratedModulesForAdmin() {
        try {
            const modules = await this.db.query.readingModules.findMany({
                where: eq(schema.readingModules.type, ModuleType.CURATED),
                orderBy: desc(schema.readingModules.updatedAt),
            });
            return modules;
        }
        catch (error) {
            console.error("Error fetching curated modules for admin:", error);
            throw new AppError('Database error fetching curated admin modules.', 500);
        }
    }
    /**
     * Fetches only custom modules (active/inactive) for admin views.
     * Includes the creator's full name.
     * Orders by most recently updated.
     */
    async getCustomModulesForAdmin() {
        try {
            const modules = await this.db
                .select({
                // Explicitly list fields from readingModules
                id: schema.readingModules.id,
                title: schema.readingModules.title,
                structuredContent: schema.readingModules.structuredContent,
                paragraphCount: schema.readingModules.paragraphCount,
                level: schema.readingModules.level,
                type: schema.readingModules.type,
                genre: schema.readingModules.genre, // Include genre
                language: schema.readingModules.language, // --- ADDED Language
                adminId: schema.readingModules.adminId,
                description: schema.readingModules.description,
                imageUrl: schema.readingModules.imageUrl,
                estimatedReadingTime: schema.readingModules.estimatedReadingTime,
                isActive: schema.readingModules.isActive,
                createdAt: schema.readingModules.createdAt,
                updatedAt: schema.readingModules.updatedAt,
                // Joined field
                adminFullName: schema.profiles.fullName
            })
                .from(schema.readingModules)
                .leftJoin(schema.profiles, eq(schema.readingModules.adminId, schema.profiles.id))
                .where(eq(schema.readingModules.type, ModuleType.CUSTOM))
                .orderBy(desc(schema.readingModules.updatedAt));
            return modules;
        }
        catch (error) {
            console.error("Error fetching custom modules for admin:", error);
            throw new AppError('Database error fetching custom admin modules.', 500);
        }
    }
    // Method to get a specific paragraph from a module
    async getModuleParagraph(moduleId, paragraphIndex) {
        if (!moduleId || paragraphIndex <= 0) {
            throw new AppError('Invalid module ID or paragraph index provided.', 400);
        }
        try {
            // Fetch only the structuredContent field for efficiency
            const moduleContent = await this.db.query.readingModules.findFirst({
                columns: { structuredContent: true },
                where: eq(schema.readingModules.id, moduleId),
            });
            if (!moduleContent || !moduleContent.structuredContent) {
                // Module not found or content is missing/invalid (shouldn't happen with NOT NULL constraint)
                return null;
            }
            // Ensure structuredContent is an array before trying to find the paragraph
            if (!Array.isArray(moduleContent.structuredContent)) {
                console.error(`Module ${moduleId} has invalid structuredContent format.`);
                throw new AppError('Internal server error: Invalid module content format.', 500);
            }
            // Find the paragraph with the matching index (assuming 1-based index in JSON)
            const paragraph = moduleContent.structuredContent.find((p) => p.index === paragraphIndex);
            return paragraph || null; // Return the found paragraph or null if index is out of bounds
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            console.error(`Error fetching paragraph ${paragraphIndex} for module ${moduleId}:`, error);
            throw new AppError('Database error fetching module paragraph.', 500);
        }
    }
    // --- VOCABULARY MANAGEMENT --- //
    /**
     * Creates a new vocabulary entry for a specific paragraph in a module.
     * Requires admin permission (checked by verifying module ownership).
     */
    async createVocabularyEntry(moduleId, userId, data) {
        try {
            // 1. Verify Module Existence and Ownership
            const module = await this.getModuleById(moduleId); // Uses getModuleById
            if (!module) {
                throw new AppError('Module not found', 404);
            }
            if (module.type === ModuleType.CUSTOM && module.adminId !== userId) {
                // Check permissions for custom modules
                const userProfile = await this.db.query.profiles.findFirst({ columns: { role: true }, where: eq(schema.profiles.id, userId) });
                if (userProfile?.role !== UserRole.SUPER_ADMIN) {
                    throw new AppError('Unauthorized to add vocabulary to this module', 403);
                }
            }
            else if (module.type === ModuleType.CURATED) {
                // Check permissions for curated modules (SuperAdmin only)
                const userProfile = await this.db.query.profiles.findFirst({ columns: { role: true }, where: eq(schema.profiles.id, userId) });
                if (userProfile?.role !== UserRole.SUPER_ADMIN) {
                    throw new AppError('Only Super Admins can add vocabulary to curated modules', 403);
                }
            }
            // 2. Validate paragraphIndex
            if (data.paragraphIndex <= 0 || data.paragraphIndex > module.paragraphCount) {
                throw new AppError(`Invalid paragraph index. Must be between 1 and ${module.paragraphCount}.`, 400);
            }
            // 3. Insert the vocabulary entry
            const [newEntry] = await this.db
                .insert(schema.vocabulary)
                .values({
                moduleId: moduleId,
                paragraphIndex: data.paragraphIndex,
                word: data.word,
                description: data.description,
            })
                .returning();
            if (!newEntry) {
                throw new AppError('Failed to create vocabulary entry', 500);
            }
            logger.info('Vocabulary entry created', { vocabularyId: newEntry.id, moduleId, paragraphIndex: data.paragraphIndex, word: data.word, createdBy: userId });
            return newEntry;
        }
        catch (error) {
            // Handle potential unique constraint violation (moduleParagraphWordIdx)
            if (error instanceof Error && 'code' in error && error.code === '23505') { // PostgreSQL unique violation code
                throw new AppError('This word has already been defined for this paragraph in this module.', 409); // 409 Conflict
            }
            if (error instanceof AppError)
                throw error;
            logger.error('Error creating vocabulary entry:', { moduleId, userId, data, error });
            throw new AppError('Failed to create vocabulary entry.', 500);
        }
    }
    /**
     * Updates an existing vocabulary entry.
     * Requires admin permission (checked by verifying module ownership).
     */
    async updateVocabularyEntry(vocabularyId, userId, updates) {
        try {
            // 1. Fetch the existing vocabulary entry
            const existingEntry = await this.db.query.vocabulary.findFirst({
                where: eq(schema.vocabulary.id, vocabularyId),
            });
            if (!existingEntry) {
                throw new AppError('Vocabulary entry not found', 404);
            }
            // 2. Fetch the module separately to check permissions
            const module = await this.db.query.readingModules.findFirst({
                where: eq(schema.readingModules.id, existingEntry.moduleId),
                columns: { id: true, adminId: true, type: true }
            });
            if (!module) {
                throw new AppError('Associated module not found', 404);
            }
            // 3. Verify Ownership/Permissions
            if (module.type === ModuleType.CUSTOM && module.adminId !== userId) {
                const userProfile = await this.db.query.profiles.findFirst({
                    columns: { role: true },
                    where: eq(schema.profiles.id, userId)
                });
                if (userProfile?.role !== UserRole.SUPER_ADMIN) {
                    throw new AppError('Unauthorized to update this vocabulary entry', 403);
                }
            }
            else if (module.type === ModuleType.CURATED) {
                const userProfile = await this.db.query.profiles.findFirst({
                    columns: { role: true },
                    where: eq(schema.profiles.id, userId)
                });
                if (userProfile?.role !== UserRole.SUPER_ADMIN) {
                    throw new AppError('Only Super Admins can update vocabulary for curated modules', 403);
                }
            }
            // 4. Perform the update
            const [updatedEntry] = await this.db
                .update(schema.vocabulary)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(schema.vocabulary.id, vocabularyId))
                .returning();
            if (!updatedEntry) {
                throw new AppError('Failed to update vocabulary entry', 500);
            }
            logger.info('Vocabulary entry updated', { vocabularyId, updatedBy: userId, updates });
            return updatedEntry;
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            logger.error('Error updating vocabulary entry:', { vocabularyId, userId, updates, error });
            throw new AppError('Failed to update vocabulary entry.', 500);
        }
    }
    /**
     * Deletes a vocabulary entry.
     * Requires admin permission (checked by verifying module ownership).
     */
    async deleteVocabularyEntry(vocabularyId, userId) {
        try {
            // 1. Fetch the existing vocabulary entry
            const existingEntry = await this.db.query.vocabulary.findFirst({
                where: eq(schema.vocabulary.id, vocabularyId),
            });
            if (!existingEntry) {
                // If not found, arguably deletion is successful (idempotent)
                logger.warn('Attempted to delete non-existent vocabulary entry', { vocabularyId });
                return;
            }
            // 2. Fetch the module separately to check permissions
            const module = await this.db.query.readingModules.findFirst({
                where: eq(schema.readingModules.id, existingEntry.moduleId),
                columns: { id: true, adminId: true, type: true }
            });
            if (!module) {
                logger.warn('Vocabulary entry found but associated module not found', { vocabularyId, moduleId: existingEntry.moduleId });
                return;
            }
            // 3. Verify Ownership/Permissions
            if (module.type === ModuleType.CUSTOM && module.adminId !== userId) {
                const userProfile = await this.db.query.profiles.findFirst({
                    columns: { role: true },
                    where: eq(schema.profiles.id, userId)
                });
                if (userProfile?.role !== UserRole.SUPER_ADMIN) {
                    throw new AppError('Unauthorized to delete this vocabulary entry', 403);
                }
            }
            else if (module.type === ModuleType.CURATED) {
                const userProfile = await this.db.query.profiles.findFirst({
                    columns: { role: true },
                    where: eq(schema.profiles.id, userId)
                });
                if (userProfile?.role !== UserRole.SUPER_ADMIN) {
                    throw new AppError('Only Super Admins can delete vocabulary for curated modules', 403);
                }
            }
            // 4. Perform the deletion
            await this.db.delete(schema.vocabulary).where(eq(schema.vocabulary.id, vocabularyId));
            logger.info('Vocabulary entry deleted', { vocabularyId, deletedBy: userId });
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            logger.error('Error deleting vocabulary entry:', { vocabularyId, userId, error });
            throw new AppError('Failed to delete vocabulary entry.', 500);
        }
    }
    /**
     * Retrieves all vocabulary entries for a specific module.
     * Typically used for admin views.
     */
    async getVocabularyForModule(moduleId) {
        try {
            const entries = await this.db.query.vocabulary.findMany({
                where: eq(schema.vocabulary.moduleId, moduleId),
                orderBy: [asc(schema.vocabulary.paragraphIndex), asc(schema.vocabulary.word)] // Order logically
            });
            return entries;
        }
        catch (error) {
            logger.error('Error fetching vocabulary for module:', { moduleId, error });
            throw new AppError('Failed to retrieve vocabulary for the module.', 500);
        }
    }
    /**
     * Retrieves vocabulary entries for a specific paragraph within a module.
     * Used by the student frontend.
     */
    async getVocabularyForParagraph(moduleId, paragraphIndex) {
        try {
            if (paragraphIndex <= 0) {
                throw new AppError('Invalid paragraph index.', 400);
            }
            const entries = await this.db.query.vocabulary.findMany({
                where: and(eq(schema.vocabulary.moduleId, moduleId), eq(schema.vocabulary.paragraphIndex, paragraphIndex)),
                orderBy: asc(schema.vocabulary.word) // Order alphabetically by word
            });
            return entries;
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            logger.error('Error fetching vocabulary for paragraph:', { moduleId, paragraphIndex, error });
            throw new AppError('Failed to retrieve vocabulary for the paragraph.', 500);
        }
    }
}
