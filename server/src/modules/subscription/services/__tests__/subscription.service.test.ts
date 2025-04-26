import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest';
// No drizzle import needed here
import { eq } from 'drizzle-orm'; 
import { db as actualDb } from '@/db'; 
import * as schema from '@/db/schema';
import { stripeService as actualStripeService } from '../stripe.service'; 
import { logger as actualLogger } from '@/utils/logger'; 
import { AppError } from '@/utils/errors';
import { SubscriptionService } from '../subscription.service';

// Mock dependencies using manual vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {
        subscriptionPlans: {
            findFirst: vi.fn(),
        },
        customerSubscriptions: {
            findFirst: vi.fn(),
        },
        profiles: {
            findFirst: vi.fn(),
        },
    },
  },
}));

vi.mock('../stripe.service', () => ({
  stripeService: {
    listPlans: vi.fn(),
    createCustomer: vi.fn(),
    createCheckoutSession: vi.fn(),
    cancelSubscription: vi.fn(),
    reactivateSubscription: vi.fn(),
    getPaymentHistory: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Get references to the *mocked* functions/objects
const mockDb = actualDb as Mocked<typeof actualDb>; 
const mockStripeService = actualStripeService as Mocked<typeof actualStripeService>;
const mockLogger = actualLogger as Mocked<typeof actualLogger>;

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;

  // Mocks for Drizzle chainable methods (Manual Setup)
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockWhere: ReturnType<typeof vi.fn>; // This will return the Promise
  let mockLimit: ReturnType<typeof vi.fn>; // <--- Re-declare mockLimit
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockValues: ReturnType<typeof vi.fn>;
  let mockOnConflictDoUpdate: ReturnType<typeof vi.fn>; // This will return the Promise
  let mockUpdate: ReturnType<typeof vi.fn>; // Add mock for update
  let mockSet: ReturnType<typeof vi.fn>;    // Add mock for set

  beforeEach(() => {
    vi.resetAllMocks(); 
    
    mockSelect = mockDb.select as ReturnType<typeof vi.fn>;
    mockInsert = mockDb.insert as ReturnType<typeof vi.fn>;
    
    mockFrom = vi.fn();
    mockWhere = vi.fn(); 
    mockLimit = vi.fn(); // <--- Re-initialize mockLimit
    mockValues = vi.fn();
    mockOnConflictDoUpdate = vi.fn(); 
    mockUpdate = mockDb.update as ReturnType<typeof vi.fn>; // Initialize mockUpdate
    mockSet = vi.fn();    // Initialize mockSet

    // --- Setup Drizzle Mock Chain (Manual) ---
    // SELECT chain ends at .limit()
    mockWhere.mockReturnValue({ limit: mockLimit }); // <--- Include limit in chain
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });

    // INSERT chain ends at .onConflictDoUpdate()
    mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
    mockInsert.mockReturnValue({ values: mockValues });

    // UPDATE chain ends at .where()
    mockSet.mockReturnValue({ where: mockWhere }); // Chain: update().set().where()
    mockUpdate.mockReturnValue({ set: mockSet });   // Start chain: update()

    subscriptionService = new SubscriptionService();
  });

  // --- Tests will go here ---
  describe('getPlans', () => {
      it('should return plans from the database if they exist', async () => {
          const mockPlans = [
              // Use full structure for clarity
              { id: 'plan_1', name: 'Basic', description: 'Desc 1', price: '10', interval: 'month', tier: 'basic', studentLimit: 3, moduleLimit: 3, customModuleLimit: 1, isActive: true, createdAt: new Date(), updatedAt: new Date() },
              { id: 'plan_2', name: 'Pro', description: 'Desc 2', price: '25', interval: 'month', tier: 'pro', studentLimit: 50, moduleLimit: 50, customModuleLimit: 99, isActive: true, createdAt: new Date(), updatedAt: new Date() },
          ];
          // Mock the final step (.where) to resolve
          mockWhere.mockResolvedValueOnce(mockPlans);

          const plans = await subscriptionService.getPlans();

          expect(plans).toEqual(mockPlans);
          expect(mockSelect).toHaveBeenCalled();
          expect(mockFrom).toHaveBeenCalledWith(schema.subscriptionPlans);
          expect(mockWhere).toHaveBeenCalledWith(eq(schema.subscriptionPlans.isActive, true)); 
          expect(mockStripeService.listPlans).not.toHaveBeenCalled(); 
      });

      it('should fetch plans from Stripe and sync to DB if DB is empty', async () => {
          const mockStripePlan1 = { 
              id: 'price_stripe_1', active: true, type: 'recurring', unit_amount: 1000,
              recurring: { interval: 'month' },
              product: { id: 'prod_1', name: 'Stripe Basic', description: 'Basic Plan Desc', metadata: { tier: 'basic', studentLimit: '5' }, deleted: false } 
          };
           const mockStripePlan2 = { 
              id: 'price_stripe_2', active: true, type: 'recurring', unit_amount: 2500, 
              recurring: { interval: 'month' },
              product: { id: 'prod_2', name: 'Stripe Pro', description: null, metadata: { tier: 'pro', moduleLimit: '50' }, deleted: false } 
          };
          const mockSyncedPlans = [ 
               { id: 'price_stripe_1', name: 'Stripe Basic', description: 'Basic Plan Desc', price: '10', interval: 'month', tier: 'basic', studentLimit: 5, moduleLimit: 3, customModuleLimit: 1, isActive: true, createdAt: expect.any(Date), updatedAt: expect.any(Date) },
               { id: 'price_stripe_2', name: 'Stripe Pro', description: null, price: '25', interval: 'month', tier: 'pro', studentLimit: 3, moduleLimit: 50, customModuleLimit: 1, isActive: true, createdAt: expect.any(Date), updatedAt: expect.any(Date) },
          ];

          // 1. First DB select returns empty (mock where)
          mockWhere.mockResolvedValueOnce([]);
          
          // 2. Mock Stripe call
          mockStripeService.listPlans.mockResolvedValueOnce([mockStripePlan1, mockStripePlan2] as any);
          
          // 3. Mock the insert/upsert call final step (.onConflictDoUpdate)
          mockOnConflictDoUpdate.mockResolvedValue({ rowCount: 2 });
          
          // 4. Second DB select returns the synced plans (mock where again)
          mockWhere.mockResolvedValueOnce(mockSyncedPlans);
          
          const plans = await subscriptionService.getPlans();

          expect(plans).toEqual(mockSyncedPlans);
          expect(mockSelect).toHaveBeenCalledTimes(2); 
          expect(mockWhere).toHaveBeenCalledTimes(2); 
          expect(mockStripeService.listPlans).toHaveBeenCalledTimes(1);
          expect(mockInsert).toHaveBeenCalledWith(schema.subscriptionPlans);
          expect(mockValues).toHaveBeenCalledTimes(2); 
          expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(2); 
          expect(mockValues).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'price_stripe_1', name: 'Stripe Basic' }));
          expect(mockValues).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 'price_stripe_2', name: 'Stripe Pro' }));
      });

      it('should handle errors when fetching from DB', async () => {
          const dbError = new Error('DB connection failed');
          // Mock the final select step (.where) to reject
          mockWhere.mockRejectedValueOnce(dbError);

          // Check type and message in one assertion
          await expect(subscriptionService.getPlans()).rejects.toThrow(
              new AppError('Failed to fetch subscription plans', 500)
          );
          // Logger check needs to happen *after* the rejection is confirmed
          expect(mockLogger.error).toHaveBeenCalledWith('Error fetching subscription plans:', dbError);
      });

      it('should handle errors when fetching from Stripe during sync', async () => {
          const stripeError = new Error('Stripe API unavailable');
          
          // Mock first select returning empty (mock where)
          mockWhere.mockResolvedValueOnce([]);
          
          // Mock stripe failure
          mockStripeService.listPlans.mockRejectedValueOnce(stripeError); 

          // Check type and message in one assertion
          await expect(subscriptionService.getPlans()).rejects.toThrow(
              new AppError('Failed to fetch subscription plans', 500) // Outer catch block throws this
          );
          expect(mockLogger.error).toHaveBeenCalledWith('Error syncing plans from Stripe:', stripeError);
      });

       it('should filter out inactive plans from Stripe', async () => {
          const mockActiveStripePlan = { 
              id: 'price_stripe_1', active: true, type: 'recurring', unit_amount: 1000,
              recurring: { interval: 'month' },
              product: { id: 'prod_1', name: 'Active Plan', metadata: { tier: 'basic' }, deleted: false } 
          };
           const mockInactiveStripePlan = { 
              id: 'price_stripe_inactive', active: false, type: 'recurring', unit_amount: 500,
              recurring: { interval: 'month' },
              product: { id: 'prod_inactive', name: 'Inactive Plan', metadata: { tier: 'old' }, deleted: false } 
          };
           const mockSyncedPlan = [ 
               { id: 'price_stripe_1', name: 'Active Plan', description: undefined, price: '10', interval: 'month', tier: 'basic', studentLimit: 3, moduleLimit: 3, customModuleLimit: 1, isActive: true, createdAt: expect.any(Date), updatedAt: expect.any(Date) }
           ];
           
          // 1. First DB select returns empty (mock where)
          mockWhere.mockResolvedValueOnce([]);

          // 2. Mock Stripe call
          mockStripeService.listPlans.mockResolvedValueOnce([mockActiveStripePlan, mockInactiveStripePlan] as any); 
          
          // 3. Mock insert (only expects one call)
          mockOnConflictDoUpdate.mockResolvedValue({ rowCount: 1 }); 

          // 4. Second DB select returns the single synced plan (mock where)
          mockWhere.mockResolvedValueOnce(mockSyncedPlan); 

          const plans = await subscriptionService.getPlans();

          expect(plans).toEqual(mockSyncedPlan);
          expect(mockInsert).toHaveBeenCalledTimes(1); 
          expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ id: 'price_stripe_1', isActive: true }));
          expect(mockValues).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'price_stripe_inactive' }));
      });
      
      it('should filter out Stripe plans with deleted products', async () => {
           const mockStripePlanWithDeletedProduct = { 
              id: 'price_stripe_deleted', active: true, type: 'recurring', unit_amount: 1000, 
              recurring: { interval: 'month' },
              product: { id: 'prod_deleted', deleted: true, object: 'product' } as any 
          };
           const mockActiveStripePlan = { 
              id: 'price_stripe_1', active: true, type: 'recurring', unit_amount: 1000,
              recurring: { interval: 'month' },
              product: { id: 'prod_1', name: 'Active Plan', metadata: { tier: 'basic' }, deleted: false, object: 'product' } as any
          };
           const mockSyncedPlan = [ 
              { id: 'price_stripe_1', name: 'Active Plan', description: undefined, price: '10', interval: 'month', tier: 'basic', studentLimit: 3, moduleLimit: 3, customModuleLimit: 1, isActive: true, createdAt: expect.any(Date), updatedAt: expect.any(Date) }
           ];

          // 1. First DB select returns empty (mock where)
          mockWhere.mockResolvedValueOnce([]);

          // 2. Mock Stripe call
          mockStripeService.listPlans.mockResolvedValueOnce([mockStripePlanWithDeletedProduct, mockActiveStripePlan] as any); 
          
          // 3. Mock insert (only expects one call)
          mockOnConflictDoUpdate.mockResolvedValue({ rowCount: 1 }); 

          // 4. Second DB select returns the single synced plan (mock where)
          mockWhere.mockResolvedValueOnce(mockSyncedPlan); 

          const plans = await subscriptionService.getPlans();
          
          expect(plans).toEqual(mockSyncedPlan);
          expect(mockInsert).toHaveBeenCalledTimes(1);
          expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ id: 'price_stripe_1' }));
          expect(mockValues).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'price_stripe_deleted' }));

      });
  });

  describe('getCurrentSubscription', () => {
    const userId = 'user-123';
    const mockSubscription = {
      id: 'sub_active_123',
      userId: userId,
      planId: 'plan_pro_456',
      stripeCustomerId: 'cus_abc',
      status: 'active' as const,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockProPlan = {
      id: 'plan_pro_456',
      name: 'Pro Plan',
      description: 'Pro features',
      price: '25',
      interval: 'month',
      tier: 'pro',
      studentLimit: 50,
      moduleLimit: 50,
      customModuleLimit: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
     const mockFreePlan = {
      id: 'plan_free_789',
      name: 'Free Plan',
      description: 'Basic features',
      price: '0',
      interval: 'month',
      tier: 'free',
      studentLimit: 3,
      moduleLimit: 3,
      customModuleLimit: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return the active subscription and associated plan if found', async () => {
      // Mock first DB call (find subscription) - final step is .limit()
      mockLimit.mockResolvedValueOnce([mockSubscription]);
      // Mock second DB call (find plan by ID) - final step is .limit()
      mockLimit.mockResolvedValueOnce([mockProPlan]);

      const result = await subscriptionService.getCurrentSubscription(userId);

      expect(result).toEqual({ 
        plan: mockProPlan, 
        subscription: mockSubscription 
      });
      expect(mockSelect).toHaveBeenCalledTimes(2); // One for sub, one for plan
      expect(mockFrom).toHaveBeenNthCalledWith(1, schema.customerSubscriptions);
      expect(mockWhere).toHaveBeenNthCalledWith(1, eq(schema.customerSubscriptions.userId, userId));
      expect(mockLimit).toHaveBeenCalledTimes(2);
      expect(mockFrom).toHaveBeenNthCalledWith(2, schema.subscriptionPlans);
      expect(mockWhere).toHaveBeenNthCalledWith(2, eq(schema.subscriptionPlans.id, mockSubscription.planId));
    });

    it('should return the free plan if no active subscription is found', async () => {
       // Mock first DB call (find subscription) - returns empty
      mockLimit.mockResolvedValueOnce([]);
      // Mock second DB call (find free plan) 
      mockLimit.mockResolvedValueOnce([mockFreePlan]);

      const result = await subscriptionService.getCurrentSubscription(userId);

      expect(result).toEqual({ 
        plan: mockFreePlan, 
        subscription: null 
      });
       expect(mockSelect).toHaveBeenCalledTimes(2); // One for sub, one for free plan
      expect(mockFrom).toHaveBeenNthCalledWith(1, schema.customerSubscriptions);
      expect(mockWhere).toHaveBeenNthCalledWith(1, eq(schema.customerSubscriptions.userId, userId));
      expect(mockLimit).toHaveBeenCalledTimes(2);
      expect(mockFrom).toHaveBeenNthCalledWith(2, schema.subscriptionPlans);
      expect(mockWhere).toHaveBeenNthCalledWith(2, eq(schema.subscriptionPlans.tier, 'free'));
    });

    it('should throw an error if no subscription and no free plan is found', async () => {
      // Mock first DB call (find subscription) - returns empty
      mockLimit.mockResolvedValueOnce([]);
      // Mock second DB call (find free plan) - returns empty
      mockLimit.mockResolvedValueOnce([]);

      // Check type and message in one assertion - Expect the specific internal error
      await expect(subscriptionService.getCurrentSubscription(userId)).rejects.toThrow(
          new AppError('No free plan found', 404)
      );
       expect(mockSelect).toHaveBeenCalledTimes(2); 
      expect(mockLimit).toHaveBeenCalledTimes(2);
    });

    it('should throw an error if subscription exists but associated plan is not found', async () => {
      // Mock first DB call (find subscription)
      mockLimit.mockResolvedValueOnce([mockSubscription]);
       // Mock second DB call (find plan by ID) - returns empty
      mockLimit.mockResolvedValueOnce([]);

      // Check type and message in one assertion - Expect the specific internal error
      await expect(subscriptionService.getCurrentSubscription(userId)).rejects.toThrow(
          new AppError('Subscription plan not found', 404)
      );
      expect(mockSelect).toHaveBeenCalledTimes(2); 
      expect(mockLimit).toHaveBeenCalledTimes(2);
    });

     it('should handle DB errors during subscription lookup', async () => {
      const dbError = new Error('DB query failed');
      // Mock the first DB call's .limit() to reject
      mockLimit.mockRejectedValueOnce(dbError);

      await expect(subscriptionService.getCurrentSubscription(userId)).rejects.toThrow(AppError);
      await expect(subscriptionService.getCurrentSubscription(userId)).rejects.toThrow('Failed to fetch subscription');
      expect(mockLogger.error).toHaveBeenCalledWith(`Error fetching subscription for user ${userId}:`, dbError);
    });

  });

  describe('createCheckoutSession', () => {
    const userId = 'user_test_123';
    const planId = 'price_basic_monthly';
    const mockPlan = { id: planId, name: 'Basic', price: '10', tier: 'home' }; // Simplified plan
    const mockProfile = { id: userId, email: 'test@example.com', fullName: 'Test User', stripeCustomerId: null };
    const mockStripeSession = { id: 'cs_test_123', url: 'https://checkout.stripe.com/pay/cs_test_123' };
    const mockStripeCustomer = { id: 'cus_test_123' };
    const mockClientUrl = 'http://localhost:3000'; // Assuming env var is mocked or set

    // Mock env var (important for success/cancel URLs)
    vi.stubEnv('CLIENT_URL', mockClientUrl);

    it('should create a checkout session for a new user (no existing subscription or stripe ID)', async () => {
      // Mock DB selects: plan exists, profile exists, no existing subscription
      mockLimit.mockResolvedValueOnce([mockPlan]);     // Plan found
      mockLimit.mockResolvedValueOnce([mockProfile]);    // Profile found
      mockLimit.mockResolvedValueOnce([]);          // No existing subscription found
      
      // Mock Stripe customer creation
      mockStripeService.createCustomer.mockResolvedValueOnce(mockStripeCustomer as any);
      
      // Mock Profile update (to store new stripeCustomerId)
      mockWhere.mockResolvedValueOnce({ rowCount: 1 }); // Mock the final .where() of the update chain
      
      // Mock Stripe checkout session creation
      mockStripeService.createCheckoutSession.mockResolvedValueOnce(mockStripeSession as any);

      // --- REMOVED Mock for db.insert(customerSubscriptions) --- 
      // mockOnConflictDoUpdate.mockResolvedValueOnce({ rowCount: 1 }); // No longer needed

      const session = await subscriptionService.createCheckoutSession(userId, planId);

      // Assertions
      expect(session).toEqual(mockStripeSession);
      expect(mockSelect).toHaveBeenCalledTimes(3); // plan, profile, existing sub
      expect(mockStripeService.createCustomer).toHaveBeenCalledWith(
        mockProfile.email,
        mockProfile.fullName,
        { userId }
      );
      // Assert profile update was called
      expect(mockUpdate).toHaveBeenCalledWith(schema.profiles);
      expect(mockSet).toHaveBeenCalledWith({ stripeCustomerId: mockStripeCustomer.id });
      expect(mockWhere).toHaveBeenCalledWith(eq(schema.profiles.id, userId)); // Check update where clause
      
      // --- REMOVED Assertion for db.insert --- 
      // expect(mockInsert).toHaveBeenCalledWith(schema.customerSubscriptions);
      // expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ userId, planId, stripeCustomerId: mockStripeCustomer.id, status: 'incomplete' }));
      
      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
        mockStripeCustomer.id,
        planId,
        `${mockClientUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        `${mockClientUrl}/subscription/cancel`
      );
    });
    
    it('should create a checkout session for a user with profile but no stripe ID and no subscription', async () => {
        const profileWithNoStripeId = { ...mockProfile, stripeCustomerId: null };
        // Mocks: plan exists, profile exists (no stripeId), no subscription
        mockLimit.mockResolvedValueOnce([mockPlan]);     
        mockLimit.mockResolvedValueOnce([profileWithNoStripeId]);    
        mockLimit.mockResolvedValueOnce([]);          

        mockStripeService.createCustomer.mockResolvedValueOnce(mockStripeCustomer as any);
        mockWhere.mockResolvedValueOnce({ rowCount: 1 }); // Mock profile update
        mockStripeService.createCheckoutSession.mockResolvedValueOnce(mockStripeSession as any);

        const session = await subscriptionService.createCheckoutSession(userId, planId);

        expect(session).toEqual(mockStripeSession);
        expect(mockStripeService.createCustomer).toHaveBeenCalledTimes(1); // Customer should be created
        expect(mockUpdate).toHaveBeenCalledWith(schema.profiles); // Profile should be updated
        expect(mockSet).toHaveBeenCalledWith({ stripeCustomerId: mockStripeCustomer.id });
        expect(mockWhere).toHaveBeenCalledWith(eq(schema.profiles.id, userId)); 
        expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(mockStripeCustomer.id, planId, expect.any(String), expect.any(String));
        // REMOVED: No check for db.insert needed
        // expect(mockInsert).not.toHaveBeenCalled(); 
    });
    
    it('should use existing stripeCustomerId from profile if no subscription exists', async () => {
        const profileWithStripeId = { ...mockProfile, stripeCustomerId: 'cus_existing_profile' };
        // Mocks: plan exists, profile exists (with stripeId), no subscription
        mockLimit.mockResolvedValueOnce([mockPlan]);     
        mockLimit.mockResolvedValueOnce([profileWithStripeId]);    
        mockLimit.mockResolvedValueOnce([]);          
        
        // Mock Stripe checkout session creation
        mockStripeService.createCheckoutSession.mockResolvedValueOnce(mockStripeSession as any);

        const session = await subscriptionService.createCheckoutSession(userId, planId);

        expect(session).toEqual(mockStripeSession);
        expect(mockStripeService.createCustomer).not.toHaveBeenCalled(); // Should NOT create a new customer
        expect(mockUpdate).not.toHaveBeenCalledWith(schema.profiles); // Should NOT update profile
        expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
            'cus_existing_profile', // Uses ID from profile
            planId,
            expect.any(String),
            expect.any(String)
        );
        // REMOVED: No check for db.insert needed
        // expect(mockInsert).not.toHaveBeenCalled(); 
    });

    it('should use existing stripeCustomerId from subscription record', async () => {
      const existingSub = { userId, planId: 'price_other_plan', stripeCustomerId: 'cus_existing_sub', status: 'active' };
      // Mocks: plan exists, profile exists, existing DIFFERENT subscription found
      mockLimit.mockResolvedValueOnce([mockPlan]);
      mockLimit.mockResolvedValueOnce([mockProfile]); // Profile needed even if sub exists
      mockLimit.mockResolvedValueOnce([existingSub]); 
      
      mockStripeService.createCheckoutSession.mockResolvedValueOnce(mockStripeSession as any);

      const session = await subscriptionService.createCheckoutSession(userId, planId);

      expect(session).toEqual(mockStripeSession);
      expect(mockStripeService.createCustomer).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalledWith(schema.profiles);
      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
        'cus_existing_sub', // Uses ID from existing subscription
        planId, 
        expect.any(String), 
        expect.any(String)
      );
      // REMOVED: No check for db.insert needed
      // expect(mockInsert).not.toHaveBeenCalled(); 
    });

    it('should throw an error if user is already actively subscribed to the same plan', async () => {
      const existingActiveSub = { userId, planId: planId, stripeCustomerId: 'cus_active', status: 'active' }; // Same planId, active status
      // Mocks: plan exists, profile exists, existing ACTIVE subscription found
      mockLimit.mockResolvedValueOnce([mockPlan]);
      mockLimit.mockResolvedValueOnce([mockProfile]);
      mockLimit.mockResolvedValueOnce([existingActiveSub]);

      // Assertions
      await expect(subscriptionService.createCheckoutSession(userId, planId)).rejects.toThrow(
        new AppError('User is already actively subscribed to this plan', 400)
      );
      expect(mockStripeService.createCustomer).not.toHaveBeenCalled();
      expect(mockStripeService.createCheckoutSession).not.toHaveBeenCalled();
      // REMOVED: No check for db.insert needed
      // expect(mockInsert).not.toHaveBeenCalled();
    });
    
    it('should ALLOW checkout if user has an INCOMPLETE subscription for the same plan', async () => {
      const existingIncompleteSub = { userId, planId: planId, stripeCustomerId: 'cus_incomplete', status: 'incomplete' }; // Same planId, incomplete status
      // Mocks: plan exists, profile exists, existing INCOMPLETE subscription found
      mockLimit.mockResolvedValueOnce([mockPlan]);
      mockLimit.mockResolvedValueOnce([mockProfile]);
      mockLimit.mockResolvedValueOnce([existingIncompleteSub]);
      
      mockStripeService.createCheckoutSession.mockResolvedValueOnce(mockStripeSession as any);

      const session = await subscriptionService.createCheckoutSession(userId, planId);

      expect(session).toEqual(mockStripeSession);
      expect(mockStripeService.createCustomer).not.toHaveBeenCalled();
      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
        'cus_incomplete', // Uses ID from incomplete subscription
        planId, 
        expect.any(String), 
        expect.any(String)
      );
      // REMOVED: No check for db.insert needed
      // expect(mockInsert).not.toHaveBeenCalled(); 
    });

    it('should throw an error if the plan is not found', async () => {
      // Mock DB selects: plan not found
      mockLimit.mockResolvedValueOnce([]); // Plan not found

      await expect(subscriptionService.createCheckoutSession(userId, planId)).rejects.toThrow(
        new AppError('Subscription plan not found', 404)
      );
    });

    it('should throw an error if the user profile is not found', async () => {
      // Mock DB selects: plan exists, profile not found
      mockLimit.mockResolvedValueOnce([mockPlan]); // Plan found
      mockLimit.mockResolvedValueOnce([]); // Profile not found

      await expect(subscriptionService.createCheckoutSession(userId, planId)).rejects.toThrow(
        new AppError('User not found', 404)
      );
    });
    
    // Add test case for error during Stripe checkout session creation
    it('should handle errors during Stripe checkout session creation', async () => {
        const stripeError = new Error('Stripe API Error');
         // Mock DB selects: plan exists, profile exists, no existing subscription
        mockLimit.mockResolvedValueOnce([mockPlan]);     
        mockLimit.mockResolvedValueOnce([mockProfile]);    
        mockLimit.mockResolvedValueOnce([]);          
        
        // Mock Stripe customer creation
        mockStripeService.createCustomer.mockResolvedValueOnce(mockStripeCustomer as any);
        // Mock Profile update 
        mockWhere.mockResolvedValueOnce({ rowCount: 1 }); 
        
        // Mock Stripe checkout session creation to throw error
        mockStripeService.createCheckoutSession.mockRejectedValueOnce(stripeError); 
        
        await expect(subscriptionService.createCheckoutSession(userId, planId)).rejects.toThrow(
            new AppError('Failed to create checkout session', 500)
        );
        expect(mockLogger.error).toHaveBeenCalledWith(`Error creating checkout session for user ${userId}:`, stripeError);
    });
    
  });

  describe('cancelSubscription', () => {
    const userId = 'user-123';
    const mockSubscriptionId = 'sub_active123';
    const mockActiveSubscription = {
        id: mockSubscriptionId,
        userId: userId,
        planId: 'plan_basic',
        stripeCustomerId: 'cus_xyz',
        stripeSubscriptionId: mockSubscriptionId, // Use the same ID for simplicity
        status: 'active', // Key: Ensure status is active
        currentPeriodStart: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15), // 15 days ago
        currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15), // 15 days from now
        cancelAtPeriodEnd: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
        updatedAt: new Date(),
    };
    // Example Stripe Subscription object (adjust fields as needed)
    const mockStripeCanceledSubscription = {
        id: mockSubscriptionId,
        status: 'canceled',
        cancel_at_period_end: false, // It's canceled immediately, not at period end
        canceled_at: Math.floor(Date.now() / 1000), // Unix timestamp
        // Add other relevant fields Stripe API returns on cancellation
    };

    it('should successfully cancel an active subscription', async () => {
        // 1. Mock select()...where().limit(1) to return the active subscription in an array
        mockLimit.mockResolvedValue([mockActiveSubscription]);

        // 2. Mock Stripe cancellation to succeed
        // Use the DB subscription ID (mockActiveSubscription.id)
        mockStripeService.cancelSubscription.mockResolvedValue(mockStripeCanceledSubscription as any); 

        // 3. Call the service method
        const result = await subscriptionService.cancelSubscription(userId);

        // 4. Verify the result is the Stripe response
        expect(result).toEqual(mockStripeCanceledSubscription);

        // Verify DB select call
        expect(mockSelect).toHaveBeenCalledWith(); // Or specific fields if used
        expect(mockFrom).toHaveBeenCalledWith(schema.customerSubscriptions);
        expect(mockWhere).toHaveBeenCalledWith(eq(schema.customerSubscriptions.userId, userId));
        expect(mockLimit).toHaveBeenCalledWith(1);

        // Verify Stripe cancellation was called with the correct ID
        expect(mockStripeService.cancelSubscription).toHaveBeenCalledWith(mockActiveSubscription.id); 

        // Verify DB update was NOT called (handled by webhook)
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(mockSet).not.toHaveBeenCalled();
    });

    it('should throw an error if the user has no subscription', async () => {
        // Mock select()...where().limit(1) to return an empty array
        mockLimit.mockResolvedValue([]);

        await expect(subscriptionService.cancelSubscription(userId)).rejects.toThrow(
            new AppError('No active subscription found', 404) // Correct error message and code
        );

        // Verify DB select call was made
        expect(mockSelect).toHaveBeenCalled();
        expect(mockFrom).toHaveBeenCalledWith(schema.customerSubscriptions);
        expect(mockWhere).toHaveBeenCalledWith(eq(schema.customerSubscriptions.userId, userId));
        expect(mockLimit).toHaveBeenCalledWith(1);

        // Ensure Stripe and DB update were NOT called
        expect(mockStripeService.cancelSubscription).not.toHaveBeenCalled();
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should throw an error if the found subscription is not active', async () => {
        const mockInactiveSubscription = { ...mockActiveSubscription, status: 'canceled' }; // Example: canceled status
         // Mock select()...where().limit(1) to return the inactive subscription in an array
        mockLimit.mockResolvedValue([mockInactiveSubscription]);

        await expect(subscriptionService.cancelSubscription(userId)).rejects.toThrow(
             new AppError('Subscription is not active', 400) // Correct error message and code
        );

        // Verify DB select call was made
         expect(mockSelect).toHaveBeenCalled();
         expect(mockFrom).toHaveBeenCalledWith(schema.customerSubscriptions);
         expect(mockWhere).toHaveBeenCalledWith(eq(schema.customerSubscriptions.userId, userId));
         expect(mockLimit).toHaveBeenCalledWith(1);

        // Ensure Stripe and DB update were NOT called
        expect(mockStripeService.cancelSubscription).not.toHaveBeenCalled();
        expect(mockUpdate).not.toHaveBeenCalled();
    });


    it('should throw an error and log if Stripe cancellation fails', async () => {
        const stripeError = new Error('Stripe API Error');
        // 1. Mock select()...where().limit(1) to return the active subscription
        mockLimit.mockResolvedValue([mockActiveSubscription]);

        // 2. Mock Stripe cancellation to fail
        mockStripeService.cancelSubscription.mockRejectedValue(stripeError);

        await expect(subscriptionService.cancelSubscription(userId)).rejects.toThrow(
            // The service throws a generic error in the final catch block for Stripe issues
            new AppError('Failed to cancel subscription', 500) 
        );

        // Verify DB select was called
        expect(mockSelect).toHaveBeenCalled();
        expect(mockLimit).toHaveBeenCalledWith(1);

        // Verify Stripe cancellation was attempted with the correct ID
        expect(mockStripeService.cancelSubscription).toHaveBeenCalledWith(mockActiveSubscription.id);
        
        // Verify logger was called
        expect(mockLogger.error).toHaveBeenCalledWith(
            `Error canceling subscription for user ${userId}:`, // Correct log message format
            stripeError
        );
         // Ensure DB update was NOT called
        expect(mockUpdate).not.toHaveBeenCalled();
    });

  });

  describe('reactivateSubscription', () => {
    const userId = 'user-reactivate-123';
    const mockSubscriptionId = 'sub_reactivate_456';

    // Mock subscription that *can* be reactivated
    const mockReactivatableSubscription = {
      id: mockSubscriptionId,
      userId: userId,
      planId: 'plan_basic',
      stripeCustomerId: 'cus_reactivate',
      stripeSubscriptionId: 'stripe_sub_reactivate',
      status: 'active' as const, 
      cancelAtPeriodEnd: true, // Key: Must be true
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Example Stripe response after successful reactivation
    const mockStripeReactivatedSubscription = {
      id: 'stripe_sub_reactivate', // This might be the Stripe ID
      status: 'active', 
      cancel_at_period_end: false, // Key: This is now false
      // Add other relevant fields Stripe returns
    };

    it('should successfully reactivate a subscription set to cancel', async () => {
      // 1. Mock DB select to find the reactivatable subscription
      mockLimit.mockResolvedValue([mockReactivatableSubscription]);

      // 2. Mock Stripe reactivation to succeed
      mockStripeService.reactivateSubscription.mockResolvedValue(mockStripeReactivatedSubscription as any);

      // 3. Call the service method
      const result = await subscriptionService.reactivateSubscription(userId);

      // 4. Verify the result is the Stripe response
      expect(result).toEqual(mockStripeReactivatedSubscription);

      // Verify DB select call
      expect(mockSelect).toHaveBeenCalledWith();
      expect(mockFrom).toHaveBeenCalledWith(schema.customerSubscriptions);
      expect(mockWhere).toHaveBeenCalledWith(eq(schema.customerSubscriptions.userId, userId));
      expect(mockLimit).toHaveBeenCalledWith(1);

      // Verify Stripe reactivation was called with the DB subscription ID
      expect(mockStripeService.reactivateSubscription).toHaveBeenCalledWith(mockReactivatableSubscription.id);

      // Verify DB update was NOT called
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should throw an error if no subscription is found for the user', async () => {
      // Mock DB select returns empty array
      mockLimit.mockResolvedValue([]);

      await expect(subscriptionService.reactivateSubscription(userId)).rejects.toThrow(
        new AppError('No subscription found for user', 404)
      );

      // Verify DB select was called
      expect(mockLimit).toHaveBeenCalledWith(1);
      // Verify Stripe was not called
      expect(mockStripeService.reactivateSubscription).not.toHaveBeenCalled();
    });

    it('should throw an error if the subscription status is not active', async () => {
      const mockInactiveSubscription = { ...mockReactivatableSubscription, status: 'canceled' as const }; // e.g., canceled
      // Mock DB select returns the inactive subscription
      mockLimit.mockResolvedValue([mockInactiveSubscription]);

      await expect(subscriptionService.reactivateSubscription(userId)).rejects.toThrow(
        new AppError('Subscription cannot be reactivated', 400)
      );
      
      // Verify DB select was called
      expect(mockLimit).toHaveBeenCalledWith(1);
       // Verify Stripe was not called
      expect(mockStripeService.reactivateSubscription).not.toHaveBeenCalled();
    });

    it('should throw an error if the subscription cancelAtPeriodEnd is false', async () => {
      const mockNotCancelingSubscription = { ...mockReactivatableSubscription, cancelAtPeriodEnd: false }; // Already not set to cancel
       // Mock DB select returns the subscription
      mockLimit.mockResolvedValue([mockNotCancelingSubscription]);

       await expect(subscriptionService.reactivateSubscription(userId)).rejects.toThrow(
        new AppError('Subscription cannot be reactivated', 400)
      );

       // Verify DB select was called
      expect(mockLimit).toHaveBeenCalledWith(1);
       // Verify Stripe was not called
      expect(mockStripeService.reactivateSubscription).not.toHaveBeenCalled();
    });

    it('should throw an error and log if Stripe reactivation fails', async () => {
      const stripeError = new Error('Stripe API Error during reactivation');
      // 1. Mock DB select to find the reactivatable subscription
      mockLimit.mockResolvedValue([mockReactivatableSubscription]);
      
      // 2. Mock Stripe reactivation to fail
      mockStripeService.reactivateSubscription.mockRejectedValue(stripeError);

      await expect(subscriptionService.reactivateSubscription(userId)).rejects.toThrow(
        // Service throws generic error for Stripe failures
        new AppError('Failed to reactivate subscription', 500)
      );

       // Verify DB select was called
      expect(mockLimit).toHaveBeenCalledWith(1);
      // Verify Stripe reactivation was attempted with the DB ID
      expect(mockStripeService.reactivateSubscription).toHaveBeenCalledWith(mockReactivatableSubscription.id);
      // Verify logger
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error reactivating subscription for user ${userId}:`,
        stripeError
      );
      // Verify DB update was NOT called
      expect(mockUpdate).not.toHaveBeenCalled();
    });

  });

  describe('getPaymentHistory', () => {
    const userId = 'user-payment-hist-789';
    const stripeCustomerId = 'cus_payment_hist_abc';

    const mockSubscriptionWithCustomerId = {
      stripeCustomerId: stripeCustomerId, // Only this field is selected
    };

    const mockPaymentHistoryData = [
      { id: 'pi_1', amount: 1000, currency: 'usd', status: 'succeeded', created: Math.floor(Date.now() / 1000) - 60*60*24*30 },
      { id: 'pi_2', amount: 1000, currency: 'usd', status: 'succeeded', created: Math.floor(Date.now() / 1000) - 60*60*24*60 },
    ];

    const mockStripePaymentHistoryResponse = {
      data: mockPaymentHistoryData,
      has_more: false,
      object: 'list',
      url: '/v1/payment_intents' // Example properties from Stripe list objects
    };

    it('should return payment history from Stripe if customer ID is found', async () => {
      // 1. Mock DB select to return the subscription with customer ID
      mockLimit.mockResolvedValue([mockSubscriptionWithCustomerId]);
      
      // 2. Mock Stripe service call
      mockStripeService.getPaymentHistory.mockResolvedValue(mockStripePaymentHistoryResponse as any);

      // 3. Call the service method
      const result = await subscriptionService.getPaymentHistory(userId);

      // 4. Verify the result is the .data part of the Stripe response
      expect(result).toEqual(mockPaymentHistoryData);

      // Verify DB select call for stripeCustomerId
      expect(mockSelect).toHaveBeenCalledWith({ stripeCustomerId: schema.customerSubscriptions.stripeCustomerId });
      expect(mockFrom).toHaveBeenCalledWith(schema.customerSubscriptions);
      expect(mockWhere).toHaveBeenCalledWith(eq(schema.customerSubscriptions.userId, userId));
      expect(mockLimit).toHaveBeenCalledWith(1);

      // Verify Stripe service was called with the correct customer ID
      expect(mockStripeService.getPaymentHistory).toHaveBeenCalledWith(stripeCustomerId);
    });

    it('should return an empty array and log warning if no subscription record is found', async () => {
      // Mock DB select returns empty array
      mockLimit.mockResolvedValue([]);

      const result = await subscriptionService.getPaymentHistory(userId);

      expect(result).toEqual([]);
      // Verify DB select call was made
      expect(mockLimit).toHaveBeenCalledWith(1);
      // Verify logger warning
      expect(mockLogger.warn).toHaveBeenCalledWith(`No Stripe customer ID found for user ${userId} when fetching payment history.`);
      // Verify Stripe service was NOT called
      expect(mockStripeService.getPaymentHistory).not.toHaveBeenCalled();
    });

    it('should return an empty array and log warning if subscription record has no customer ID', async () => {
      const mockSubscriptionWithoutCustomerId = { stripeCustomerId: null }; // No ID
      // Mock DB select returns record without ID
      mockLimit.mockResolvedValue([mockSubscriptionWithoutCustomerId]);

      const result = await subscriptionService.getPaymentHistory(userId);

      expect(result).toEqual([]);
      // Verify DB select call was made
      expect(mockLimit).toHaveBeenCalledWith(1);
      // Verify logger warning
       expect(mockLogger.warn).toHaveBeenCalledWith(`No Stripe customer ID found for user ${userId} when fetching payment history.`);
      // Verify Stripe service was NOT called
      expect(mockStripeService.getPaymentHistory).not.toHaveBeenCalled();
    });

    it('should handle errors during database lookup', async () => {
      const dbError = new Error('DB connection error');
      // Mock DB select fails
      mockLimit.mockRejectedValue(dbError);

      await expect(subscriptionService.getPaymentHistory(userId)).rejects.toThrow(
        new AppError('Failed to fetch payment history', 500)
      );

      // Verify DB select attempt
      expect(mockLimit).toHaveBeenCalledWith(1);
      // Verify logger error
      expect(mockLogger.error).toHaveBeenCalledWith(`Error fetching payment history for user ${userId}:`, dbError);
      // Verify Stripe was not called
      expect(mockStripeService.getPaymentHistory).not.toHaveBeenCalled();
    });

     it('should handle errors during Stripe API call', async () => {
      const stripeError = new Error('Stripe API unavailable');
      // 1. Mock DB select to return the subscription with customer ID
      mockLimit.mockResolvedValue([mockSubscriptionWithCustomerId]);
      // 2. Mock Stripe service call fails
      mockStripeService.getPaymentHistory.mockRejectedValue(stripeError);

      await expect(subscriptionService.getPaymentHistory(userId)).rejects.toThrow(
        new AppError('Failed to fetch payment history', 500)
      );

      // Verify DB select call
      expect(mockLimit).toHaveBeenCalledWith(1);
      // Verify Stripe service was called
      expect(mockStripeService.getPaymentHistory).toHaveBeenCalledWith(stripeCustomerId);
      // Verify logger error
       expect(mockLogger.error).toHaveBeenCalledWith(`Error fetching payment history for user ${userId}:`, stripeError);
    });

  });

}); 