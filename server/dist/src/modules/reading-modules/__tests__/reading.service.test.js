import { describe, it, expect, beforeEach, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres'; // Assuming node-postgres driver
import * as schema from '@/db/schema'; // Import schemas for types and mocking
import { ReadingModuleService } from '../services/reading.service.js'; // Added NewVocabularyInput
import { ReadingLevel, ModuleType, UserRole, Language } from '@shared/types'; // Correctly import UserRole enum and Genre, Paragraph, Language
import { AppError } from '@/utils/errors'; // Import AppError for error handling
import { eq, and, or, desc, asc } from 'drizzle-orm'; // Import eq for mocking where clauses
// Mock the dependencies using drizzle.mock()
vi.mock('@/db', async (importOriginal) => {
    // Import the actual schema
    const actualSchema = await import('@/db/schema');
    // Import the actual testConnection function if needed
    const actualDbModule = await importOriginal();
    // Use drizzle.mock directly from the driver import
    const mockDbInstance = drizzle.mock({ schema: actualSchema, logger: false });
    return {
        // Provide the mocked db instance
        db: mockDbInstance,
        // Keep the original testConnection function if it's used elsewhere
        testConnection: actualDbModule.testConnection || vi.fn(),
    };
});
// Mock SubscriptionService
vi.mock('@/modules/subscription/services/subscription.service', () => {
    return {
        SubscriptionService: vi.fn().mockImplementation(() => ({
            getCurrentSubscription: vi.fn(),
            getPlanById: vi.fn()
        }))
    };
});
describe('ReadingModuleService', () => {
    let readingModuleService;
    // Use the specific Drizzle database type for the mock
    let mockDb;
    let mockSubscriptionService;
    const testAdminId = 'admin-uuid-123';
    const testModuleId = 'module-uuid-456';
    const curatedModuleId = 'curated-uuid-789';
    // Define a sample module with all required fields
    const mockReadingModule = {
        id: 'module-uuid-sample',
        title: 'Sample Module',
        structuredContent: [{ index: 1, text: 'Sample content' }],
        paragraphCount: 1,
        level: ReadingLevel.LEVEL_1,
        type: ModuleType.CURATED,
        genre: 'History',
        language: Language.US,
        adminId: null,
        description: 'Sample description',
        imageUrl: null,
        estimatedReadingTime: 5,
        isActive: true,
        authorFirstName: 'John',
        authorLastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    // Infer type from the table schema
    const mockPlan = {
        id: 'plan_test_mock',
        name: 'Test Home Plan',
        description: 'Home tier subscription with custom module creation',
        price: '9.99',
        interval: 'month',
        tier: 'home',
        studentLimit: 5,
        moduleLimit: 1000, // Set to 1000 as specified by the user
        customModuleLimit: 100, // Set to a reasonable value for home tier
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    beforeEach(async () => {
        vi.resetAllMocks();
        // Import the mocked db instance dynamically AFTER mocks are set up
        const { db: importedMockDb } = await import('@/db');
        // Cast to the specific mocked database type, using unknown as intermediate step
        mockDb = importedMockDb;
        // Create the ReadingModuleService instance with the mocked db
        // Pass mockDb directly, the types should align now
        // Cast to 'any' to satisfy constructor expectation of $client property which mock doesn't have
        readingModuleService = new ReadingModuleService(mockDb);
        // Replace the internal SubscriptionService with our mock
        mockSubscriptionService = {
            getCurrentSubscription: vi.fn().mockResolvedValue({
                plan: mockPlan,
                subscription: null
            }),
            getPlanById: vi.fn().mockResolvedValue(mockPlan)
        };
        // @ts-ignore - Access private property to inject mock
        readingModuleService.subscriptionService = mockSubscriptionService;
        // --- Use vi.spyOn to mock specific db method CALLS ---
        // Example: Mock findFirst directly on the query object provided by drizzle.mock
        // These will be set within each test or specific describe block as needed
        vi.spyOn(mockDb.query.readingModules, 'findFirst');
        vi.spyOn(mockDb.query.readingModules, 'findMany');
        // Update default profile mock to include required ID and cast
        vi.spyOn(mockDb.query.profiles, 'findFirst').mockResolvedValue({ id: 'default-admin-id', role: UserRole.ADMIN }); // Use Partial and cast to any
        // We will also spy on insert, update, delete, select directly on mockDb as needed in tests
        // --- FIX: Provide a more structured default mock for insert chain --- 
        const mockInsertReturning = vi.fn().mockResolvedValue([]); // Default empty return
        const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
        vi.spyOn(mockDb, 'insert').mockImplementation(() => ({ values: mockInsertValues }));
        vi.spyOn(mockDb, 'update').mockReturnThis();
        vi.spyOn(mockDb, 'delete').mockReturnThis();
    });
    it('should be defined', () => {
        expect(readingModuleService).toBeDefined(); // Check if the service is instantiated
    });
    // --- Test cases for creating modules ---
    describe('createModule', () => {
        it('should create a new curated module successfully', async () => {
            const inputData = {
                title: 'Test Curated Module',
                structuredContent: [{ index: 1, text: 'Module content here' }],
                level: ReadingLevel.LEVEL_3,
                type: ModuleType.CURATED,
                genre: 'Science',
                language: Language.UK,
            };
            const expectedModule = {
                id: curatedModuleId,
                title: inputData.title,
                structuredContent: inputData.structuredContent,
                paragraphCount: 1,
                level: inputData.level,
                type: ModuleType.CURATED,
                genre: inputData.genre,
                language: inputData.language,
                adminId: null,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
                isActive: true,
                description: null,
                imageUrl: null,
                estimatedReadingTime: null,
                authorFirstName: null,
                authorLastName: null,
            };
            // Spy on the insert chain for this specific test
            const mockReturning = vi.fn().mockResolvedValueOnce([expectedModule]);
            const mockValues = vi.fn(() => ({ returning: mockReturning }));
            vi.spyOn(mockDb, 'insert').mockImplementationOnce(() => ({ values: mockValues }));
            const createdModule = await readingModuleService.createModule(inputData);
            expect(mockDb.insert).toHaveBeenCalledWith(schema.readingModules); // Check insert was called
            expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
                title: inputData.title,
                structuredContent: inputData.structuredContent,
                paragraphCount: 1,
                level: inputData.level,
                type: ModuleType.CURATED,
                genre: inputData.genre,
                language: inputData.language,
                adminId: null,
                isActive: true,
            }));
            expect(createdModule).toEqual(expectedModule);
        });
        it('should create a new custom module successfully with an adminId', async () => {
            const inputData = {
                title: 'Test Custom Module',
                structuredContent: [{ index: 1, text: 'Custom content' }],
                level: ReadingLevel.LEVEL_5,
                type: ModuleType.CUSTOM,
                adminId: testAdminId,
                genre: 'Fantasy',
                language: Language.US,
            };
            const expectedModule = {
                id: testModuleId,
                title: inputData.title,
                structuredContent: inputData.structuredContent,
                paragraphCount: 1,
                level: inputData.level,
                type: ModuleType.CUSTOM,
                genre: inputData.genre,
                language: inputData.language,
                adminId: testAdminId,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
                isActive: true,
                description: null,
                imageUrl: null,
                estimatedReadingTime: null,
                authorFirstName: null,
                authorLastName: null,
            };
            // **FIX**: Add spy for the count check before the insert spy
            const mockWhereCount = vi.fn().mockResolvedValueOnce([{ value: 0 }]); // Simulate count is low
            const mockFromCount = vi.fn(() => ({ where: mockWhereCount }));
            vi.spyOn(mockDb, 'select').mockImplementationOnce(() => ({ from: mockFromCount }));
            // Spy on the insert chain for this specific test
            const mockReturningInsert = vi.fn().mockResolvedValueOnce([expectedModule]); // Rename for clarity
            const mockValues = vi.fn(() => ({ returning: mockReturningInsert }));
            vi.spyOn(mockDb, 'insert').mockImplementationOnce(() => ({ values: mockValues }));
            const createdModule = await readingModuleService.createModule(inputData);
            expect(mockDb.insert).toHaveBeenCalledWith(schema.readingModules);
            expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
                title: inputData.title,
                structuredContent: inputData.structuredContent,
                paragraphCount: 1,
                level: inputData.level,
                type: ModuleType.CUSTOM,
                genre: inputData.genre,
                language: inputData.language,
                adminId: testAdminId,
                isActive: true,
            }));
            expect(createdModule).toEqual(expectedModule);
        });
        it('should throw an error if creating a custom module without adminId', async () => {
            const inputData = {
                title: 'Invalid Custom Module',
                structuredContent: [{ index: 1, text: 'No admin' }],
                level: ReadingLevel.LEVEL_1,
                type: ModuleType.CUSTOM,
                genre: 'History',
                language: Language.UK,
            };
            await expect(readingModuleService.createModule(inputData))
                .rejects.toThrow(new AppError('Admin ID is required for custom modules.', 400));
        });
        it('should throw an error if required fields are missing (including genre and language)', async () => {
            const inputDataMissingGenre = {
                title: 'Incomplete Module',
                type: ModuleType.CURATED,
                level: ReadingLevel.LEVEL_1,
                structuredContent: [{ index: 1, text: 'abc' }],
                language: Language.UK,
            };
            const inputDataMissingTitle = {
                structuredContent: [{ index: 1, text: 'abc' }],
                level: ReadingLevel.LEVEL_1,
                type: ModuleType.CURATED,
                genre: 'History',
                language: Language.UK,
                // Missing title
            };
            const inputDataMissingLanguage = {
                title: 'Incomplete Module',
                type: ModuleType.CURATED,
                level: ReadingLevel.LEVEL_1,
                structuredContent: [{ index: 1, text: 'abc' }],
                genre: 'History',
            };
            await expect(readingModuleService.createModule(inputDataMissingGenre))
                .rejects.toThrow(new AppError('Missing required fields for module creation.', 400));
            await expect(readingModuleService.createModule(inputDataMissingTitle))
                .rejects.toThrow(new AppError('Missing required fields for module creation.', 400));
            await expect(readingModuleService.createModule(inputDataMissingLanguage))
                .rejects.toThrow(new AppError('Missing required fields for module creation.', 400));
            // No need to check mockInsert directly, check no db calls were made if applicable
        });
        // Test subscription limits (adapt mocks if needed)
        it('should throw 403 if custom module limit is reached', async () => {
            const inputData = {
                title: 'Exceed Limit Module',
                structuredContent: [{ index: 1, text: 'Content' }],
                level: ReadingLevel.LEVEL_5,
                type: ModuleType.CUSTOM,
                adminId: testAdminId,
                genre: 'History',
                language: Language.UK,
            };
            // Mock the count query used by the service (assuming it uses select().from()... )
            const mockWhereCount = vi.fn().mockResolvedValueOnce([{ value: 100 }]); // Use a different name to avoid conflict
            const mockFromCount = vi.fn(() => ({ where: mockWhereCount }));
            vi.spyOn(mockDb, 'select').mockImplementationOnce(() => ({ from: mockFromCount }));
            // Mock the subscription service
            mockSubscriptionService.getCurrentSubscription.mockResolvedValue({
                plan: { ...mockPlan, customModuleLimit: 100 },
                subscription: null
            });
            await expect(readingModuleService.createModule(inputData))
                .rejects.toThrow(new AppError("Custom module limit (100) for your current plan ('home') has been reached. Please upgrade to create more custom modules.", 403));
        });
        it('should throw 403 if user is on Free plan', async () => {
            // Mock plan to be free
            const freePlan = { ...mockPlan, tier: 'free', customModuleLimit: 0 };
            mockSubscriptionService.getCurrentSubscription.mockResolvedValue({ plan: freePlan, subscription: null });
            const inputData = {
                title: 'Free Plan Module',
                structuredContent: [{ index: 1, text: 'Content' }],
                level: ReadingLevel.LEVEL_5,
                type: ModuleType.CUSTOM,
                adminId: testAdminId,
                genre: 'Custom',
                language: Language.UK,
            };
            await expect(readingModuleService.createModule(inputData))
                .rejects.toThrow(new AppError('Custom module creation is not allowed on the Free plan. Please upgrade.', 403));
        });
    });
    // --- Test cases for retrieving modules ---
    describe('getModuleById', () => {
        it('should return a module if found', async () => {
            const expectedModule = {
                id: testModuleId,
                title: 'Found Module',
                structuredContent: [{ index: 1, text: 'Content' }],
                paragraphCount: 1,
                level: ReadingLevel.LEVEL_2,
                type: ModuleType.CUSTOM,
                adminId: testAdminId,
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
                description: null,
                imageUrl: null,
                estimatedReadingTime: null,
                genre: 'History',
                language: Language.US,
                authorFirstName: null,
                authorLastName: null,
            };
            // Use the spy set up in beforeEach or override here
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValueOnce(expectedModule);
            const module = await readingModuleService.getModuleById(testModuleId);
            expect(module).toEqual(expectedModule);
            expect(module?.genre).toBe('History');
            expect(module?.language).toBe('US');
        });
        it('should return null if module not found', async () => {
            // Set the mock to resolve undefined specifically for this test
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValueOnce(undefined);
            const foundModule = await readingModuleService.getModuleById('non-existent-id');
            expect(mockDb.query.readingModules.findFirst).toHaveBeenCalledOnce();
            expect(mockDb.query.readingModules.findFirst).toHaveBeenCalledWith({
                where: eq(schema.readingModules.id, 'non-existent-id'),
            });
            expect(foundModule).toBeNull();
        });
    });
    describe('getActiveModules', () => {
        it('should return only active modules', async () => {
            const activeModule = {
                id: 'active-1',
                title: 'Active Module',
                structuredContent: [{ index: 1, text: '...' }],
                paragraphCount: 1,
                level: ReadingLevel.LEVEL_1,
                type: ModuleType.CURATED,
                adminId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
                description: null,
                imageUrl: null,
                estimatedReadingTime: null,
                genre: 'History',
                language: Language.US,
                authorFirstName: null,
                authorLastName: null,
            };
            vi.spyOn(mockDb.query.readingModules, 'findMany').mockResolvedValueOnce([activeModule]);
            const modules = await readingModuleService.getActiveModules(testAdminId);
            expect(mockDb.query.readingModules.findMany).toHaveBeenCalledWith({
                where: and(eq(schema.readingModules.isActive, true), or(eq(schema.readingModules.type, ModuleType.CURATED), and(eq(schema.readingModules.type, ModuleType.CUSTOM), eq(schema.readingModules.adminId, testAdminId))))
            });
            expect(modules).toHaveLength(1);
            expect(modules[0]).toEqual(activeModule);
            expect(modules[0].genre).toBe('History');
            expect(modules[0].language).toBe('US');
        });
        it('should return an empty array if no active modules found', async () => {
            vi.spyOn(mockDb.query.readingModules, 'findMany').mockResolvedValueOnce([]);
            const modules = await readingModuleService.getActiveModules(testAdminId);
            expect(mockDb.query.readingModules.findMany).toHaveBeenCalledWith({
                where: and(eq(schema.readingModules.isActive, true), or(eq(schema.readingModules.type, ModuleType.CURATED), and(eq(schema.readingModules.type, ModuleType.CUSTOM), eq(schema.readingModules.adminId, testAdminId))))
            });
            expect(modules).toEqual([]);
        });
        it('should return limited curated modules for non-authenticated user', async () => {
            const mockModules = [
                { ...mockReadingModule, id: 'c1', type: ModuleType.CURATED, genre: 'History', language: Language.US },
                { ...mockReadingModule, id: 'c2', type: ModuleType.CURATED, genre: 'Science', language: Language.UK },
                { ...mockReadingModule, id: 'c3', type: ModuleType.CURATED, genre: 'Adventure', language: Language.US },
            ];
            // Cast the mock data to satisfy the stricter type check
            vi.spyOn(mockDb.query.readingModules, 'findMany').mockResolvedValue(mockModules);
            const modules = await readingModuleService.getActiveModules();
            expect(mockDb.query.readingModules.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.anything(),
                limit: 3,
                orderBy: asc(schema.readingModules.createdAt)
            }));
            expect(modules).toEqual(mockModules);
        });
        it('should return curated modules for authenticated user', async () => {
            const freePlan = { ...mockPlan, tier: 'free' };
            mockSubscriptionService.getCurrentSubscription.mockResolvedValue({ plan: freePlan, subscription: null });
            const mockModules = [
                { ...mockReadingModule, id: 'c1', type: ModuleType.CURATED, genre: 'History', language: Language.US },
                { ...mockReadingModule, id: 'c2', type: ModuleType.CURATED, genre: 'Science', language: Language.UK },
                { ...mockReadingModule, id: 'c3', type: ModuleType.CURATED, genre: 'Adventure', language: Language.US },
                { ...mockReadingModule, id: 'c4', type: ModuleType.CURATED, genre: 'Fantasy', language: Language.US },
                { ...mockReadingModule, id: 'c5', type: ModuleType.CURATED, genre: 'Non-Fiction', language: Language.UK },
            ];
            // Cast the mock data
            vi.spyOn(mockDb.query.readingModules, 'findMany').mockResolvedValue(mockModules);
            const modules = await readingModuleService.getActiveModules(testAdminId);
            expect(mockSubscriptionService.getCurrentSubscription).toHaveBeenCalledWith(testAdminId);
            expect(mockDb.query.readingModules.findMany).toHaveBeenCalled();
            expect(modules).toEqual(mockModules);
        });
        it('should return curated modules for authenticated user with paid plan', async () => {
            const paidPlan = { ...mockPlan, tier: 'home' };
            mockSubscriptionService.getCurrentSubscription.mockResolvedValue({ plan: paidPlan, subscription: null });
            const mockModules = [
                { ...mockReadingModule, id: 'c1', type: ModuleType.CURATED, genre: 'History', language: Language.US },
                { ...mockReadingModule, id: 'cust1', type: ModuleType.CUSTOM, adminId: testAdminId, genre: 'Custom', language: Language.UK },
                { ...mockReadingModule, id: 'c2', type: ModuleType.CURATED, genre: 'Science', language: Language.US },
                { ...mockReadingModule, id: 'cust_other', type: ModuleType.CUSTOM, adminId: 'other-admin', genre: 'Mystery', language: Language.UK },
            ];
            // Mock should return the expected *filtered* result for this user
            const expectedFilteredModules = [
                { ...mockReadingModule, id: 'c1', type: ModuleType.CURATED, genre: 'History', language: Language.US },
                { ...mockReadingModule, id: 'cust1', type: ModuleType.CUSTOM, adminId: testAdminId, genre: 'Custom', language: Language.UK },
                { ...mockReadingModule, id: 'c2', type: ModuleType.CURATED, genre: 'Science', language: Language.US },
            ];
            // Cast the mock data
            vi.spyOn(mockDb.query.readingModules, 'findMany').mockResolvedValue(expectedFilteredModules);
            const modules = await readingModuleService.getActiveModules(testAdminId);
            expect(mockSubscriptionService.getCurrentSubscription).toHaveBeenCalledWith(testAdminId);
            expect(mockDb.query.readingModules.findMany).toHaveBeenCalled();
            expect(modules).toEqual(expectedFilteredModules);
            expect(modules[0].genre).toBeDefined();
            expect(modules[0].language).toBeDefined();
        });
        it('should return modules for a specific admin', async () => {
            const mockModules = [
                { ...mockReadingModule, id: 'm1', adminId: testAdminId, type: ModuleType.CUSTOM, genre: 'Fantasy', language: Language.US },
                { ...mockReadingModule, id: 'm2', adminId: testAdminId, type: ModuleType.CUSTOM, genre: 'Custom', language: Language.UK },
            ];
            // Cast the mock data
            vi.spyOn(mockDb.query.readingModules, 'findMany').mockResolvedValue(mockModules);
            const modules = await readingModuleService.getModulesByAdmin(testAdminId);
            expect(mockDb.query.readingModules.findMany).toHaveBeenCalledWith({
                where: eq(schema.readingModules.adminId, testAdminId),
            });
            expect(modules).toHaveLength(2);
            expect(modules[0].genre).toBeDefined();
            expect(modules[0].language).toBeDefined();
        });
        it('should throw AppError if adminId is not provided', async () => {
            await expect(readingModuleService.getModulesByAdmin(null))
                .rejects.toThrow(new AppError('Admin ID is required to fetch modules by admin.', 400));
        });
        it('should allow SuperAdmin to update any module', async () => {
            const existingModule = { ...mockReadingModule, id: curatedModuleId, adminId: null, type: ModuleType.CURATED, genre: 'Science', language: Language.US };
            const updates = { isActive: false, genre: 'Custom', language: Language.UK };
            const expectedUpdatedModule = { ...existingModule, ...updates, language: Language.UK, updatedAt: expect.any(Date) };
            // Cast mock data for findFirst
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValue(existingModule);
            // Update profile mock
            vi.spyOn(mockDb.query.profiles, 'findFirst').mockResolvedValue({ id: 'super-admin-uuid', role: UserRole.SUPER_ADMIN });
            // Mock the update chain
            const mockReturningUpdate = vi.fn().mockResolvedValueOnce([expectedUpdatedModule]);
            const mockWhereUpdate = vi.fn(() => ({ returning: mockReturningUpdate }));
            const mockSetUpdate = vi.fn(() => ({ where: mockWhereUpdate }));
            vi.spyOn(mockDb, 'update').mockImplementationOnce(() => ({ set: mockSetUpdate }));
            const updatedModule = await readingModuleService.updateModule(curatedModuleId, updates, 'super-admin-uuid');
            expect(mockSetUpdate).toHaveBeenCalledWith(expect.objectContaining({ ...updates, updatedAt: expect.any(Date) }));
            expect(updatedModule).toEqual(expectedUpdatedModule);
            expect(updatedModule.genre).toBe('Custom');
            expect(updatedModule.language).toBe('UK');
        });
        it('should throw 404 if module to update is not found', async () => {
            // Use undefined instead of null for not found
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValue(undefined);
            const updates = { title: 'New Title' };
            await expect(readingModuleService.updateModule('non-existent-id', updates, testAdminId))
                .rejects.toThrow(new AppError('Module not found.', 404));
        });
        it('should throw 403 if user is not owner and not SuperAdmin', async () => {
            const existingModule = { ...mockReadingModule, id: testModuleId, adminId: 'another-admin-id', type: ModuleType.CUSTOM, genre: 'Mystery', language: Language.US };
            // Cast mock data
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValue(existingModule);
            // Update profile mock
            vi.spyOn(mockDb.query.profiles, 'findFirst').mockResolvedValue({ id: testAdminId, role: UserRole.ADMIN });
            const updates = { title: 'Attempted Update' };
            await expect(readingModuleService.updateModule(testModuleId, updates, testAdminId))
                .rejects.toThrow(new AppError('Unauthorized to update this module.', 403));
        });
        it('should recalculate paragraphCount if structuredContent is updated', async () => {
            const existingModule = { ...mockReadingModule, id: testModuleId, adminId: testAdminId, type: ModuleType.CUSTOM, genre: 'History', language: Language.US };
            const newContent = [{ index: 1, text: 'p1' }, { index: 2, text: 'p2' }];
            const updates = { structuredContent: newContent };
            const expectedUpdatedModule = { ...existingModule, ...updates, paragraphCount: 2, updatedAt: expect.any(Date) };
            // Cast mock data
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValue(existingModule);
            // Update profile mock
            vi.spyOn(mockDb.query.profiles, 'findFirst').mockResolvedValue({ id: testAdminId, role: UserRole.ADMIN });
            // Mock the update chain
            const mockReturningRecalc = vi.fn().mockResolvedValueOnce([expectedUpdatedModule]);
            const mockWhereRecalc = vi.fn(() => ({ returning: mockReturningRecalc }));
            const mockSetRecalc = vi.fn(() => ({ where: mockWhereRecalc }));
            vi.spyOn(mockDb, 'update').mockImplementationOnce(() => ({ set: mockSetRecalc }));
            const updatedModule = await readingModuleService.updateModule(testModuleId, updates, testAdminId);
            expect(mockSetRecalc).toHaveBeenCalledWith(expect.objectContaining({ structuredContent: newContent, paragraphCount: 2, updatedAt: expect.any(Date) }));
            expect(updatedModule.genre).toBe('History');
            expect(updatedModule.language).toBe('US');
        });
        // --- ADDED: Test genre validation on update ---
        // it('should handle invalid genre on update', async () => { ... }); 
        // --- END ADDED ---
    });
    // --- Test cases for deleting modules (soft delete) ---
    describe('deleteModule', () => {
        const originalDate = new Date();
        const existingModule = {
            id: testModuleId,
            title: 'To Delete',
            structuredContent: [{ index: 1, text: 'Content' }],
            paragraphCount: 1,
            level: ReadingLevel.LEVEL_2,
            type: ModuleType.CUSTOM,
            adminId: testAdminId,
            createdAt: originalDate,
            updatedAt: originalDate,
            isActive: true,
            description: null,
            imageUrl: null,
            estimatedReadingTime: null,
            genre: 'History',
            language: Language.US,
            authorFirstName: null,
            authorLastName: null,
        };
        it('should set isActive to false for the specified module when owner deletes', async () => {
            const expectedDeletedModule = { ...existingModule, isActive: false, updatedAt: expect.any(Date) };
            const returnedDeletedModule = { ...existingModule, isActive: false, updatedAt: new Date() };
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValueOnce(existingModule);
            // Mock the update chain for delete (which uses update internally)
            const mockReturningDelete = vi.fn().mockResolvedValueOnce([returnedDeletedModule]);
            const mockWhereDelete = vi.fn(() => ({ returning: mockReturningDelete }));
            const mockSetDelete = vi.fn(() => ({ where: mockWhereDelete }));
            vi.spyOn(mockDb, 'update').mockImplementationOnce(() => ({ set: mockSetDelete }));
            // Correct owner deleting
            const deletedModule = await readingModuleService.deleteModule(testModuleId, testAdminId);
            expect(mockDb.query.readingModules.findFirst).toHaveBeenCalledWith({ where: eq(schema.readingModules.id, testModuleId) });
            expect(mockDb.update).toHaveBeenCalledWith(schema.readingModules);
            expect(mockSetDelete).toHaveBeenCalledWith({ isActive: false, updatedAt: expect.any(Date) });
            expect(mockWhereDelete).toHaveBeenCalledWith(eq(schema.readingModules.id, testModuleId));
            expect(mockReturningDelete).toHaveBeenCalledOnce();
            expect(deletedModule).toEqual(expect.objectContaining(expectedDeletedModule));
            expect(deletedModule.isActive).toBe(false);
            expect(deletedModule.genre).toBe('History');
            expect(deletedModule.language).toBe('US');
        });
        it('should throw an error if module to delete is not found', async () => {
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValueOnce(undefined);
            await expect(readingModuleService.deleteModule('non-existent-id', testAdminId))
                .rejects.toThrow(new AppError('Module not found.', 404));
            expect(vi.mocked(mockDb.update)).not.toHaveBeenCalled();
        });
        it('should throw forbidden error if non-admin tries to delete another admin\'s custom module', async () => {
            const otherAdminId = 'other-admin-uuid-456';
            const moduleOwnedByOtherAdmin = {
                ...existingModule,
                id: 'other-admin-module-delete',
                adminId: otherAdminId, // Owned by someone else
                type: ModuleType.CUSTOM,
                genre: 'History',
                language: Language.US,
                authorFirstName: null,
                authorLastName: null,
            };
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValueOnce(moduleOwnedByOtherAdmin);
            // Mock the profile query to return a standard admin role
            vi.spyOn(mockDb.query.profiles, 'findFirst').mockResolvedValueOnce({ role: UserRole.ADMIN });
            await expect(readingModuleService.deleteModule('other-admin-module-delete', testAdminId // Current user is testAdminId
            )).rejects.toThrow(new AppError('Forbidden: You do not have permission to delete this module.', 403));
            expect(vi.mocked(mockDb.update)).not.toHaveBeenCalled(); // Ensure update (delete) was not called
        });
        it('should prevent a non-Super Admin from deleting a curated module', async () => {
            const curatedModule = {
                ...existingModule,
                id: 'curated-for-delete',
                type: ModuleType.CURATED,
                adminId: null,
                genre: 'History',
                language: Language.US,
                authorFirstName: null,
                authorLastName: null,
            };
            const returnedDeletedCurated = { ...curatedModule, isActive: false, updatedAt: new Date() };
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValueOnce(curatedModule);
            // Mock the profile query to return a standard admin role
            vi.spyOn(mockDb.query.profiles, 'findFirst').mockResolvedValueOnce({ role: UserRole.ADMIN });
            // Expect rejection because a standard ADMIN cannot delete CURATED
            await expect(readingModuleService.deleteModule('curated-for-delete', testAdminId // Standard Admin ID
            )).rejects.toThrow(new AppError('Forbidden: You do not have permission to delete this module.', 403));
            expect(vi.mocked(mockDb.update)).not.toHaveBeenCalled(); // Ensure update (delete) was NOT called
        });
        // --- NEW SUPER ADMIN TESTS for deleteModule --- //
        it('should allow Super Admin to delete a curated module', async () => {
            const curatedModule = { ...existingModule, type: ModuleType.CURATED, adminId: null, genre: 'History', language: Language.US };
            const returnedDeletedModule = { ...curatedModule, isActive: false, updatedAt: new Date() };
            // Cast mock data
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValueOnce(curatedModule);
            // Update profile mock
            vi.spyOn(mockDb.query.profiles, 'findFirst').mockResolvedValueOnce({ id: 'super-admin-uuid', role: UserRole.SUPER_ADMIN });
            // Mock the update chain
            const mockReturningSADelete = vi.fn().mockResolvedValueOnce([returnedDeletedModule]);
            const mockWhereSADelete = vi.fn(() => ({ returning: mockReturningSADelete }));
            const mockSetSADelete = vi.fn(() => ({ where: mockWhereSADelete }));
            vi.spyOn(mockDb, 'update').mockImplementationOnce(() => ({ set: mockSetSADelete }));
            await expect(readingModuleService.deleteModule(curatedModule.id, 'super-admin-uuid' // ID representing the Super Admin
            )).resolves.toEqual(expect.objectContaining({ isActive: false, updatedAt: expect.any(Date) }));
            expect(mockDb.update).toHaveBeenCalledOnce();
            expect(mockSetSADelete).toHaveBeenCalledWith({ isActive: false, updatedAt: expect.any(Date) });
            expect(returnedDeletedModule.genre).toBe('History');
            expect(returnedDeletedModule.language).toBe('US');
        });
        it('should allow Super Admin to delete another admin\'s custom module', async () => {
            const otherAdminId = 'other-admin-uuid';
            const moduleOwnedByOther = { ...existingModule, adminId: otherAdminId, type: ModuleType.CUSTOM, genre: 'History', language: Language.UK };
            const returnedDeletedModule = { ...moduleOwnedByOther, isActive: false, updatedAt: new Date() };
            // Cast mock data
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValueOnce(moduleOwnedByOther);
            // Update profile mock
            vi.spyOn(mockDb.query.profiles, 'findFirst').mockResolvedValueOnce({ id: 'super-admin-uuid', role: UserRole.SUPER_ADMIN });
            // Mock the update chain
            const mockReturningOtherSADelete = vi.fn().mockResolvedValueOnce([returnedDeletedModule]);
            const mockWhereOtherSADelete = vi.fn(() => ({ returning: mockReturningOtherSADelete }));
            const mockSetOtherSADelete = vi.fn(() => ({ where: mockWhereOtherSADelete }));
            vi.spyOn(mockDb, 'update').mockImplementationOnce(() => ({ set: mockSetOtherSADelete }));
            await expect(readingModuleService.deleteModule(moduleOwnedByOther.id, 'super-admin-uuid' // ID representing the Super Admin
            )).resolves.toEqual(expect.objectContaining({ isActive: false, updatedAt: expect.any(Date) }));
            expect(mockDb.update).toHaveBeenCalledOnce();
            expect(mockSetOtherSADelete).toHaveBeenCalledWith({ isActive: false, updatedAt: expect.any(Date) });
            expect(returnedDeletedModule.genre).toBe('History');
            expect(returnedDeletedModule.language).toBe('UK');
        });
        it('should allow SuperAdmin to delete any module', async () => {
            // Ensure literal type here for both type and genre
            const existingModule = { ...mockReadingModule, id: curatedModuleId, type: ModuleType.CURATED, genre: 'Science', language: Language.US };
            // FIX: Mock the update chain using spyOn with the mock driver
            // The mock driver should handle the chain internally. We just need to mock the final resolution.
            // Since the service returns the *original* module before "deletion" (update),
            // and the update itself doesn't return anything useful in this flow,
            // we mock the .where() part to resolve (implicitly completing the operation).
            // **FIX**: Add .returning() to the mocked chain
            const mockReturningSADeleteAny = vi.fn().mockResolvedValueOnce([existingModule]);
            const mockWhereSADeleteAny = vi.fn(() => ({ returning: mockReturningSADeleteAny }));
            const mockSetSADeleteAny = vi.fn(() => ({ where: mockWhereSADeleteAny }));
            vi.spyOn(mockDb, 'update').mockImplementation(() => ({ set: mockSetSADeleteAny }));
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValue(existingModule);
            vi.spyOn(mockDb.query.profiles, 'findFirst').mockResolvedValue({ role: UserRole.SUPER_ADMIN });
            // Capture the result
            const deletedModule = await readingModuleService.deleteModule(curatedModuleId, 'super-admin-uuid');
            expect(mockDb.query.readingModules.findFirst).toHaveBeenCalledWith({ where: eq(schema.readingModules.id, curatedModuleId) });
            expect(mockDb.query.profiles.findFirst).toHaveBeenCalledWith({ columns: { role: true }, where: eq(schema.profiles.id, 'super-admin-uuid') });
            // Assert that the UPDATE mock chain was called correctly
            expect(mockDb.update).toHaveBeenCalledTimes(1);
            expect(mockSetSADeleteAny).toHaveBeenCalledWith(expect.objectContaining({ isActive: false, updatedAt: expect.any(Date) }));
            expect(mockWhereSADeleteAny).toHaveBeenCalledWith(eq(schema.readingModules.id, curatedModuleId));
            expect(deletedModule).toEqual(existingModule); // Service returns pre-delete state
            expect(deletedModule.language).toBe('US');
        });
        it('should throw 403 if user tries to delete module they don\'t own (and not SuperAdmin)', async () => {
            // Ensure literal type here
            const existingModule = { ...mockReadingModule, id: testModuleId, adminId: 'another-admin-id', type: ModuleType.CUSTOM, genre: 'Mystery', language: Language.UK };
            // Cast mock data
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValue(existingModule);
            // Update profile mock
            vi.spyOn(mockDb.query.profiles, 'findFirst').mockResolvedValue({ role: UserRole.ADMIN });
            await expect(readingModuleService.deleteModule(testModuleId, testAdminId))
                .rejects.toThrow(new AppError('Forbidden: You do not have permission to delete this module.', 403));
        });
    });
    // --- NEW TEST SUITE for Admin Query Methods --- //
    describe('Admin Query Methods', () => {
        const module1 = { ...mockReadingModule, id: 'mod-1', title: 'Module 1', updatedAt: new Date(2024, 0, 1), language: Language.US };
        const module2 = { ...mockReadingModule, id: 'mod-2', title: 'Module 2 (Custom)', type: ModuleType.CUSTOM, adminId: testAdminId, updatedAt: new Date(2024, 0, 2), genre: 'Custom', language: Language.UK };
        const module3 = { ...mockReadingModule, id: 'mod-3', title: 'Module 3', updatedAt: new Date(2024, 0, 3), type: ModuleType.CURATED, genre: 'History', language: Language.US };
        const allModules = [module3, module2, module1]; // Expected order: newest first
        it('getAllModulesForAdmin should return all modules ordered by updatedAt desc', async () => {
            vi.spyOn(mockDb.query.readingModules, 'findMany').mockResolvedValueOnce(allModules);
            const result = await readingModuleService.getAllModulesForAdmin();
            expect(mockDb.query.readingModules.findMany).toHaveBeenCalledWith({
                orderBy: desc(schema.readingModules.updatedAt),
            });
            expect(result).toEqual(allModules);
        });
        it('getCuratedModulesForAdmin should return only curated modules ordered by updatedAt desc', async () => {
            const curatedModules = [module3, module1];
            vi.spyOn(mockDb.query.readingModules, 'findMany').mockResolvedValueOnce(curatedModules);
            const result = await readingModuleService.getCuratedModulesForAdmin();
            expect(mockDb.query.readingModules.findMany).toHaveBeenCalledWith({
                where: eq(schema.readingModules.type, ModuleType.CURATED),
                orderBy: desc(schema.readingModules.updatedAt),
            });
            expect(result).toEqual(curatedModules);
        });
        it('getCustomModulesForAdmin should return only custom modules with admin name, ordered by updatedAt desc', async () => {
            const customModuleWithAdminName = { ...module2, adminFullName: 'Test Admin User' };
            // Mock the select chain
            const mockOrderByAdmin = vi.fn().mockResolvedValueOnce([customModuleWithAdminName]);
            const mockWhereAdmin = vi.fn(() => ({ orderBy: mockOrderByAdmin }));
            const mockLeftJoinAdmin = vi.fn(() => ({ where: mockWhereAdmin }));
            const mockFromAdmin = vi.fn(() => ({ leftJoin: mockLeftJoinAdmin }));
            // **FIX**: Add select spy setup here as it was removed from beforeEach
            vi.spyOn(mockDb, 'select').mockImplementationOnce(() => ({ from: mockFromAdmin }));
            const result = await readingModuleService.getCustomModulesForAdmin();
            expect(mockDb.select).toHaveBeenCalledWith({
                id: schema.readingModules.id,
                title: schema.readingModules.title,
                structuredContent: schema.readingModules.structuredContent,
                paragraphCount: schema.readingModules.paragraphCount,
                level: schema.readingModules.level,
                type: schema.readingModules.type,
                genre: schema.readingModules.genre,
                language: schema.readingModules.language,
                adminId: schema.readingModules.adminId,
                description: schema.readingModules.description,
                imageUrl: schema.readingModules.imageUrl,
                estimatedReadingTime: schema.readingModules.estimatedReadingTime,
                isActive: schema.readingModules.isActive,
                createdAt: schema.readingModules.createdAt,
                updatedAt: schema.readingModules.updatedAt,
                adminFullName: schema.profiles.fullName
            });
            expect(mockFromAdmin).toHaveBeenCalledWith(schema.readingModules);
            expect(mockLeftJoinAdmin).toHaveBeenCalledWith(schema.profiles, eq(schema.readingModules.adminId, schema.profiles.id));
            expect(mockWhereAdmin).toHaveBeenCalledWith(eq(schema.readingModules.type, ModuleType.CUSTOM));
            expect(mockOrderByAdmin).toHaveBeenCalledWith(desc(schema.readingModules.updatedAt));
            expect(result).toEqual([customModuleWithAdminName]);
        });
    });
    // --- END NEW TEST SUITE --- //
    // --- Add tests for getModuleParagraph ---
    describe('getModuleParagraph', () => {
        const moduleId = 'module-123';
        // Sample structured content with multiple paragraphs
        const sampleStructuredContent = [
            { index: 1, text: 'This is the first paragraph of the module.' },
            { index: 2, text: 'This is the second paragraph with more details.' },
            { index: 3, text: 'This is the third and final paragraph summarizing the content.' }
        ];
        beforeEach(() => {
            // Reset the query mock (or rely on test-specific mocks)
            vi.spyOn(mockDb.query.readingModules, 'findFirst');
        });
        it('should fetch a specific paragraph by index successfully', async () => {
            // Mock the module query response with structured content
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValue({
                ...mockReadingModule,
                id: moduleId,
                structuredContent: sampleStructuredContent
            });
            // Test fetching the second paragraph
            const result = await readingModuleService.getModuleParagraph(moduleId, 2);
            // Verify the module was queried with the right parameters
            expect(mockDb.query.readingModules.findFirst).toHaveBeenCalledWith({
                columns: { structuredContent: true },
                where: eq(schema.readingModules.id, moduleId)
            });
            // Verify the correct paragraph was returned
            expect(result).toEqual(sampleStructuredContent[1]); // Index 1 is the second paragraph (index 2)
        });
        it('should return null if the module is not found', async () => {
            // Mock module query to return null
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValue(undefined);
            const result = await readingModuleService.getModuleParagraph(moduleId, 1);
            expect(result).toBeNull();
        });
        it('should return null if the paragraph index is not found', async () => {
            // Mock module query with content but invalid paragraph index
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValue({
                ...mockReadingModule,
                id: moduleId,
                structuredContent: sampleStructuredContent
            });
            // Try to fetch a non-existent paragraph
            const result = await readingModuleService.getModuleParagraph(moduleId, 10);
            expect(result).toBeNull();
        });
        it('should throw an error if moduleId or paragraphIndex is invalid', async () => {
            // Test with invalid moduleId
            await expect(readingModuleService.getModuleParagraph('', 1))
                .rejects.toThrow(new AppError('Invalid module ID or paragraph index provided.', 400));
            // Test with invalid paragraphIndex
            await expect(readingModuleService.getModuleParagraph(moduleId, 0))
                .rejects.toThrow(new AppError('Invalid module ID or paragraph index provided.', 400));
            // Test with negative paragraphIndex
            await expect(readingModuleService.getModuleParagraph(moduleId, -1))
                .rejects.toThrow(new AppError('Invalid module ID or paragraph index provided.', 400));
        });
        it('should throw an error if structuredContent is not an array', async () => {
            // Mock module query with invalid structuredContent format
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockResolvedValue({
                ...mockReadingModule,
                id: moduleId,
                structuredContent: "This is not an array",
                title: 'Invalid Content Module',
                paragraphCount: 0,
                level: ReadingLevel.LEVEL_1,
                type: ModuleType.CURATED,
                genre: 'History',
                language: Language.US,
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
                description: null,
                imageUrl: null,
                estimatedReadingTime: null,
                authorFirstName: null,
                authorLastName: null,
            });
            await expect(readingModuleService.getModuleParagraph(moduleId, 1))
                .rejects.toThrow(new AppError('Internal server error: Invalid module content format.', 500));
        });
        it('should handle database errors gracefully', async () => {
            // Mock database error
            vi.spyOn(mockDb.query.readingModules, 'findFirst').mockRejectedValue(new Error('Database connection error'));
            await expect(readingModuleService.getModuleParagraph(moduleId, 1))
                .rejects.toThrow(new AppError('Database error fetching module paragraph.', 500));
        });
    });
    // --- NEW TEST SUITE for Vocabulary Management --- //
    describe('Vocabulary Management', () => {
        const vocabModuleId = 'vocab-module-uuid-1';
        const vocabUserId = 'vocab-user-uuid-1';
        const vocabEntryId = 'vocab-entry-uuid-1';
        const paragraphIdx = 1;
        const mockModuleForVocab = {
            ...mockReadingModule,
            id: vocabModuleId,
            adminId: vocabUserId,
            type: ModuleType.CUSTOM,
            paragraphCount: 3,
            genre: 'Science',
            language: Language.UK,
            authorFirstName: null,
            authorLastName: null,
        };
        const mockVocabularyInput = {
            paragraphIndex: paragraphIdx,
            word: 'synergy',
            description: 'The interaction of elements that when combined produce a total effect that is greater than the sum of the individual elements.'
        };
        const mockVocabularyEntry = {
            id: vocabEntryId,
            moduleId: vocabModuleId,
            paragraphIndex: paragraphIdx,
            word: mockVocabularyInput.word,
            description: mockVocabularyInput.description,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        beforeEach(() => {
            // Add spies for vocabulary queries within this describe block
            vi.spyOn(mockDb.query.vocabulary, 'findFirst');
            vi.spyOn(mockDb.query.vocabulary, 'findMany');
            // Reset general spies if needed, or rely on test-specific mocks
            vi.mocked(mockDb.insert).mockClear();
            vi.mocked(mockDb.update).mockClear();
            vi.mocked(mockDb.delete).mockClear();
            vi.mocked(mockDb.query.readingModules.findFirst).mockClear();
            vi.mocked(mockDb.query.profiles.findFirst).mockResolvedValue({ id: vocabUserId, role: UserRole.ADMIN });
        });
        // --- Tests for createVocabularyEntry ---
        describe('createVocabularyEntry', () => {
            it('should create a vocabulary entry successfully', async () => {
                vi.spyOn(readingModuleService, 'getModuleById').mockResolvedValueOnce(mockModuleForVocab);
                const mockReturning = vi.fn().mockResolvedValueOnce([mockVocabularyEntry]);
                const mockValues = vi.fn(() => ({ returning: mockReturning }));
                vi.spyOn(mockDb, 'insert').mockImplementationOnce(() => ({ values: mockValues }));
                const result = await readingModuleService.createVocabularyEntry(vocabModuleId, vocabUserId, mockVocabularyInput);
                expect(readingModuleService.getModuleById).toHaveBeenCalledWith(vocabModuleId);
                expect(mockDb.insert).toHaveBeenCalledWith(schema.vocabulary);
                expect(mockValues).toHaveBeenCalledWith({
                    moduleId: vocabModuleId,
                    paragraphIndex: mockVocabularyInput.paragraphIndex,
                    word: mockVocabularyInput.word,
                    description: mockVocabularyInput.description,
                });
                expect(result).toEqual(mockVocabularyEntry);
            });
            it('should throw 404 if module not found', async () => {
                vi.spyOn(readingModuleService, 'getModuleById').mockResolvedValueOnce(null);
                await expect(readingModuleService.createVocabularyEntry(vocabModuleId, vocabUserId, mockVocabularyInput))
                    .rejects.toThrow(new AppError('Module not found', 404));
            });
            it('should throw 403 if user is not owner/super-admin of custom module', async () => {
                vi.spyOn(readingModuleService, 'getModuleById').mockResolvedValueOnce({ ...mockModuleForVocab, adminId: 'other-user' });
                vi.mocked(mockDb.query.profiles.findFirst).mockResolvedValueOnce({ id: vocabUserId, role: UserRole.ADMIN });
                await expect(readingModuleService.createVocabularyEntry(vocabModuleId, vocabUserId, mockVocabularyInput))
                    .rejects.toThrow(new AppError('Unauthorized to add vocabulary to this module', 403));
            });
            it('should throw 403 if user is not super-admin of curated module', async () => {
                vi.spyOn(readingModuleService, 'getModuleById').mockResolvedValueOnce({ ...mockModuleForVocab, type: ModuleType.CURATED, adminId: null });
                vi.mocked(mockDb.query.profiles.findFirst).mockResolvedValueOnce({ id: vocabUserId, role: UserRole.ADMIN });
                await expect(readingModuleService.createVocabularyEntry(vocabModuleId, vocabUserId, mockVocabularyInput))
                    .rejects.toThrow(new AppError('Only Super Admins can add vocabulary to curated modules', 403));
            });
            it('should throw 400 if paragraphIndex is out of bounds', async () => {
                vi.spyOn(readingModuleService, 'getModuleById').mockResolvedValueOnce(mockModuleForVocab);
                const invalidInput = { ...mockVocabularyInput, paragraphIndex: 99 };
                await expect(readingModuleService.createVocabularyEntry(vocabModuleId, vocabUserId, invalidInput))
                    .rejects.toThrow(new AppError(`Invalid paragraph index. Must be between 1 and ${mockModuleForVocab.paragraphCount}.`, 400));
            });
            it('should throw 409 on unique constraint violation', async () => {
                vi.spyOn(readingModuleService, 'getModuleById').mockResolvedValueOnce(mockModuleForVocab);
                // FIX: Reject with an Error object that has the 'code' property
                const uniqueConstraintError = new Error('Simulated unique constraint violation');
                uniqueConstraintError.code = '23505'; // Attach the code property
                const mockReturning = vi.fn().mockRejectedValueOnce(uniqueConstraintError);
                const mockValues = vi.fn(() => ({ returning: mockReturning }));
                vi.spyOn(mockDb, 'insert').mockImplementationOnce(() => ({ values: mockValues }));
                await expect(readingModuleService.createVocabularyEntry(vocabModuleId, vocabUserId, mockVocabularyInput))
                    .rejects.toThrow(new AppError('This word has already been defined for this paragraph in this module.', 409));
            });
        });
        // --- Tests for updateVocabularyEntry ---
        describe('updateVocabularyEntry', () => {
            const updateData = { description: 'A new, updated description.' };
            const mockExistingEntryWithModule = {
                ...mockVocabularyEntry,
                module: mockModuleForVocab
            };
            it('should update a vocabulary entry successfully', async () => {
                vi.mocked(mockDb.query.vocabulary.findFirst).mockResolvedValueOnce(mockExistingEntryWithModule);
                const expectedUpdatedEntry = { ...mockVocabularyEntry, ...updateData, updatedAt: expect.any(Date) };
                const mockReturning = vi.fn().mockResolvedValueOnce([expectedUpdatedEntry]);
                const mockWhere = vi.fn(() => ({ returning: mockReturning }));
                const mockSet = vi.fn(() => ({ where: mockWhere }));
                vi.spyOn(mockDb, 'update').mockImplementationOnce(() => ({ set: mockSet }));
                const result = await readingModuleService.updateVocabularyEntry(vocabEntryId, vocabUserId, updateData);
                expect(mockDb.query.vocabulary.findFirst).toHaveBeenCalledWith({
                    where: eq(schema.vocabulary.id, vocabEntryId),
                    with: { module: { columns: { id: true, adminId: true, type: true } } }
                });
                expect(mockDb.update).toHaveBeenCalledWith(schema.vocabulary);
                expect(mockSet).toHaveBeenCalledWith({ ...updateData, updatedAt: expect.any(Date) });
                expect(mockWhere).toHaveBeenCalledWith(eq(schema.vocabulary.id, vocabEntryId));
                expect(result).toEqual(expectedUpdatedEntry);
            });
            it('should throw 404 if vocabulary entry not found', async () => {
                vi.mocked(mockDb.query.vocabulary.findFirst).mockResolvedValueOnce(undefined);
                await expect(readingModuleService.updateVocabularyEntry(vocabEntryId, vocabUserId, updateData))
                    .rejects.toThrow(new AppError('Vocabulary entry or associated module not found', 404));
            });
            it('should throw 403 if user is not owner/super-admin', async () => {
                const entryWithOtherOwner = {
                    ...mockVocabularyEntry,
                    module: { ...mockModuleForVocab, adminId: 'other-user' }
                };
                vi.mocked(mockDb.query.vocabulary.findFirst).mockResolvedValueOnce(entryWithOtherOwner);
                vi.mocked(mockDb.query.profiles.findFirst).mockResolvedValueOnce({ id: vocabUserId, role: UserRole.ADMIN });
                await expect(readingModuleService.updateVocabularyEntry(vocabEntryId, vocabUserId, updateData))
                    .rejects.toThrow(new AppError('Unauthorized to update this vocabulary entry', 403));
            });
        });
        // --- Tests for deleteVocabularyEntry ---
        describe('deleteVocabularyEntry', () => {
            const mockExistingEntryWithModule = {
                ...mockVocabularyEntry,
                module: mockModuleForVocab
            };
            it('should delete a vocabulary entry successfully', async () => {
                vi.mocked(mockDb.query.vocabulary.findFirst).mockResolvedValueOnce(mockExistingEntryWithModule);
                const mockWhere = vi.fn().mockResolvedValueOnce({ rowCount: 1 });
                vi.spyOn(mockDb, 'delete').mockImplementationOnce(() => ({ where: mockWhere }));
                await readingModuleService.deleteVocabularyEntry(vocabEntryId, vocabUserId);
                expect(mockDb.query.vocabulary.findFirst).toHaveBeenCalledWith({
                    where: eq(schema.vocabulary.id, vocabEntryId),
                    with: { module: { columns: { id: true, adminId: true, type: true } } }
                });
                expect(mockDb.delete).toHaveBeenCalledWith(schema.vocabulary);
                expect(mockWhere).toHaveBeenCalledWith(eq(schema.vocabulary.id, vocabEntryId));
            });
            it('should not throw if vocabulary entry not found (idempotent)', async () => {
                vi.mocked(mockDb.query.vocabulary.findFirst).mockResolvedValueOnce(undefined);
                await expect(readingModuleService.deleteVocabularyEntry(vocabEntryId, vocabUserId)).resolves.toBeUndefined();
                expect(mockDb.delete).not.toHaveBeenCalled();
            });
            it('should throw 403 if user is not owner/super-admin', async () => {
                const entryWithOtherOwner = {
                    ...mockVocabularyEntry,
                    module: { ...mockModuleForVocab, adminId: 'other-user' }
                };
                vi.mocked(mockDb.query.vocabulary.findFirst).mockResolvedValueOnce(entryWithOtherOwner);
                vi.mocked(mockDb.query.profiles.findFirst).mockResolvedValueOnce({ id: vocabUserId, role: UserRole.ADMIN });
                await expect(readingModuleService.deleteVocabularyEntry(vocabEntryId, vocabUserId))
                    .rejects.toThrow(new AppError('Unauthorized to delete this vocabulary entry', 403));
            });
        });
        // --- Tests for getVocabularyForModule ---
        describe('getVocabularyForModule', () => {
            it('should return vocabulary entries for a module', async () => {
                const entries = [mockVocabularyEntry, { ...mockVocabularyEntry, id: 'v2', word: 'paradigm' }];
                vi.mocked(mockDb.query.vocabulary.findMany).mockResolvedValueOnce(entries);
                const result = await readingModuleService.getVocabularyForModule(vocabModuleId);
                expect(mockDb.query.vocabulary.findMany).toHaveBeenCalledWith({
                    where: eq(schema.vocabulary.moduleId, vocabModuleId),
                    orderBy: [asc(schema.vocabulary.paragraphIndex), asc(schema.vocabulary.word)]
                });
                expect(result).toEqual(entries);
            });
            it('should return an empty array if no entries found', async () => {
                vi.mocked(mockDb.query.vocabulary.findMany).mockResolvedValueOnce([]);
                const result = await readingModuleService.getVocabularyForModule(vocabModuleId);
                expect(result).toEqual([]);
            });
        });
        // --- Tests for getVocabularyForParagraph ---
        describe('getVocabularyForParagraph', () => {
            const targetParagraphIndex = 2;
            const entries = [
                { ...mockVocabularyEntry, paragraphIndex: targetParagraphIndex, word: 'algorithm' },
                { ...mockVocabularyEntry, paragraphIndex: targetParagraphIndex, word: 'heuristic' }
            ];
            it('should return vocabulary entries for a specific paragraph', async () => {
                vi.mocked(mockDb.query.vocabulary.findMany).mockResolvedValueOnce(entries);
                const result = await readingModuleService.getVocabularyForParagraph(vocabModuleId, targetParagraphIndex);
                expect(mockDb.query.vocabulary.findMany).toHaveBeenCalledWith({
                    where: and(eq(schema.vocabulary.moduleId, vocabModuleId), eq(schema.vocabulary.paragraphIndex, targetParagraphIndex)),
                    orderBy: asc(schema.vocabulary.word)
                });
                expect(result).toEqual(entries);
            });
            it('should return an empty array if no entries found for the paragraph', async () => {
                vi.mocked(mockDb.query.vocabulary.findMany).mockResolvedValueOnce([]);
                const result = await readingModuleService.getVocabularyForParagraph(vocabModuleId, targetParagraphIndex);
                expect(result).toEqual([]);
            });
            it('should throw 400 for invalid paragraph index', async () => {
                await expect(readingModuleService.getVocabularyForParagraph(vocabModuleId, 0))
                    .rejects.toThrow(new AppError('Invalid paragraph index.', 400));
            });
        });
    }); // End describe Vocabulary Management
});
