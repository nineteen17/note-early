import { vi } from 'vitest';
import { ReadingLevel } from '@shared/types';

// Mock Drizzle DB 
vi.mock('@/db', () => {
  return { 
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  };
});

// Mock Supabase
vi.mock('@/config/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },

  },
  supabaseAdmin: {
    // Mock admin client if needed
  },
}));

// Mock bcrypt
vi.mock('bcrypt', async (importOriginal) => {
  const actual = await importOriginal() as typeof import('bcrypt'); 
  return {
    ...actual, 
    hash: vi.fn(),   
    compare: vi.fn(),
  };
});

// Mock SubscriptionService
vi.mock('@/modules/subscription/services/subscription.service', () => {
  const SubscriptionService = vi.fn();
  SubscriptionService.prototype.getCurrentSubscription = vi.fn();
  return { SubscriptionService };
});

// Mock logger
vi.mock('@/utils/logger');

// Now import everything else
import { describe, it, expect, beforeEach, Mocked, Mock } from 'vitest';
import { db } from '@/db';
import { Profile, profiles } from '@/db/schema';
import { AuthService } from '../auth.service';
import { supabase } from '@/config/supabase';
import bcrypt from 'bcrypt';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { logger } from '@/utils/logger';
import { SubscriptionService } from '@/modules/subscription/services/subscription.service';
import { 
    SubscriptionPlan as SubscriptionPlanSchema, 
    CustomerSubscription 
} from '@/db/schema';

// --- Test Suite ---
describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: Mocked<typeof db>;
  let mockSupabase: Mocked<typeof supabase>;
  const mockReturning = vi.fn(); // Shared mock for results
  const mockUser = { id: 'test-user-id', email: 'test@example.com' } as User;

  // Helper function to create a mock profile
  const createMockProfile = (overrides: Partial<Profile> = {}): Profile => {
    // Try direct cast to satisfy excess property check
    return {
        id: 'uuid-test',
        adminId: null,
        fullName: 'Test User',
        email: 'test@test.com',
        pin: 'hashed_pin',
        role: "ADMIN",
        avatarUrl: null,
        studentId: null, // Cast should handle TS2353
        adminPassword: 'hashed_admin_password',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        subscriptionStatus: null,
        subscriptionExpiresAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        ...overrides,
    } as Profile; // Direct cast
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockDb = vi.mocked(db);
    mockSupabase = vi.mocked(supabase);
    const MockSubscriptionService = vi.mocked(SubscriptionService, true);
    MockSubscriptionService.mockClear();
    MockSubscriptionService.prototype.getCurrentSubscription.mockClear();

    authService = new AuthService(mockDb);

    // Reset shared mock
    mockReturning.mockReset();

    // Configure the mock implementation to allow chaining with proper types
    mockDb.insert = vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation(() => ({
        returning: mockReturning
      }))
    })) as any;

    mockDb.update = vi.fn().mockImplementation(() => ({ 
      set: vi.fn().mockImplementation(() => ({       
        where: vi.fn().mockImplementation(() => ({    
          returning: mockReturning
        }))
      }))
    })) as any;

    // Default mock implementations for bcrypt/supabase
    (bcrypt.hash as Mock) = vi.fn().mockImplementation(async () => Promise.resolve('hashed_value')); 
    (bcrypt.compare as Mock) = vi.fn().mockImplementation(async () => Promise.resolve(true)); 
    // vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null }); // This caused issues, mock specific methods later
    
    // Mock the necessary auth methods globally using the defined mockUser
    mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockUser, session: {} as Session }, error: null }), 
        updateUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }), // Add signOut here
        // Add other methods from GoTrueClient if needed, mocked as empty functions or specific returns
    } as any; // Cast to 'any' to bypass strict type checking
    
    // Mock DB select for the final profile fetch (can be overridden in specific tests)
    mockDb.select = vi.fn().mockImplementation(() => ({ 
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockReturnValueOnce([createMockProfile()]) // Default return value
      }))
    })) as any;
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  // --- Tests for loginAdmin ---
  describe('loginAdmin', () => {
    const testEmail = 'admin@test.com';
    const testPassword = 'password123';
    const mockSession = { access_token: 'abc' } as Session;
    const mockProfile = createMockProfile({ id: mockUser.id, email: testEmail, role: "ADMIN" });

    it('should login via Supabase, fetch profile, and return profile, user, session', async () => {
      (mockSupabase.auth.signInWithPassword as Mock).mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null });
      
      // Use type-safe mock for select
      mockDb.select = vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce([mockProfile])
        })
      }) as any;
      
      const result = await authService.loginAdmin(testEmail, testPassword);
      
      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual({ user: mockUser, session: mockSession, profile: mockProfile });
    });

    it('should throw supabase error if Supabase login fails', async () => {
      // No select mock needed here
      const authError = new AuthError('Invalid login credentials');
      (mockSupabase.auth.signInWithPassword as Mock).mockResolvedValue({ data: {user: null, session: null}, error: authError });
      await expect(authService.loginAdmin(testEmail, testPassword))
          .rejects.toThrow(`Authentication error: ${authError.message}`);
      expect(mockDb.select).not.toHaveBeenCalled(); 
    });
    
    it('should throw generic error if Supabase login returns no user', async () => {
      // No select mock needed here
      (mockSupabase.auth.signInWithPassword as Mock).mockResolvedValue({ data: { user: null, session: null }, error: null });
      await expect(authService.loginAdmin(testEmail, testPassword))
          .rejects.toThrow('Login failed'); 
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should throw error if profile not found in DB', async () => {
      (mockSupabase.auth.signInWithPassword as Mock).mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null });
      
      // Mock empty results array
      mockDb.select = vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce([])
        })
      }) as any;
      
      await expect(authService.loginAdmin(testEmail, testPassword))
          .rejects.toThrow('Admin profile not found');
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should throw error if profile role is not ADMIN', async () => {
      // Define FULL select mock specific to this test
      const studentProfile = createMockProfile({ id: mockUser.id, email: testEmail, role: "STUDENT" });
      
      (mockSupabase.auth.signInWithPassword as Mock).mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null });
      
      // Mock with student profile
      mockDb.select = vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce([studentProfile])
        })
      }) as any;
      
      await expect(authService.loginAdmin(testEmail, testPassword))
          .rejects.toThrow('Admin profile not found');
    });
  });

  // --- Tests for createStudent ---
  describe('createStudent', () => {
    const adminId = 'admin-uuid';
    const testFullName = 'Test Student';
    const testPin = '1234';
    const testAge = 10;
    const testReadingLevel = ReadingLevel.LEVEL_2;
    const mockCreatedProfile = createMockProfile({
      id: 'new-student-uuid',
      fullName: testFullName,
      pin: 'hashed_pin',
      role: 'STUDENT',
      adminId: adminId,
      age: testAge,
      readingLevel: testReadingLevel,
    });

    // Define the spy for the .values method here, outside beforeEach
    const valuesSpy = vi.fn();
    
    // Define mockPlan outside beforeEach so it's accessible in tests
    const mockPlan: SubscriptionPlanSchema = {
      id: 'plan-id-mock', 
      name: 'Mock Plan',
      description: 'Mock description',
      price: '0',
      interval: 'month',
      tier: 'free' as const, // Use 'as const' for the literal type
      studentLimit: 5, 
      moduleLimit: 10, 
      customModuleLimit: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      // Reset the spy before each test
      valuesSpy.mockReset();
      // Configure the spy's implementation for returning
      valuesSpy.mockImplementation(() => ({
        returning: mockReturning
      }));

      // Mock insert returning the created profile
      mockReturning.mockResolvedValue([mockCreatedProfile]); // Use array for consistency

      // --- Mock for SubscriptionService and student count ---
      // Use the mockPlan defined outside this beforeEach block
      vi.mocked(SubscriptionService.prototype.getCurrentSubscription).mockResolvedValue({ plan: mockPlan, subscription: null }); 
      
      // Mock the student count query simply
      mockDb.select = vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnThis(), // Use mockReturnThis for chaining
        where: vi.fn().mockResolvedValueOnce([{ value: 0 }]) // Resolve with the count
      }) as any;

      // Restore default insert mock for the actual creation step
      mockDb.insert = vi.fn().mockImplementation(() => ({ 
        values: valuesSpy // Use the dedicated spy here
      })) as any;
      // -----------------------------------------------------------
    });

    it('should hash the pin, insert student profile with age and readingLevel, and return the new profile', async () => {
      // Override subscription mock for THIS test to allow creation
      // Explicitly type the tier for the override AND the resulting object
      const paidPlan: SubscriptionPlanSchema = { 
        ...mockPlan, 
        tier: 'home' as const // Ensure literal type is used
      };
      vi.mocked(SubscriptionService.prototype.getCurrentSubscription).mockResolvedValueOnce({ plan: paidPlan, subscription: null });
      
      const result = await authService.createStudent(adminId, testFullName, testPin, testAge, testReadingLevel);

      expect(bcrypt.hash).toHaveBeenCalledWith(testPin, 10);
      expect(mockDb.insert).toHaveBeenCalledWith(profiles);
      
      // Assert against the dedicated valuesSpy
      expect(valuesSpy).toHaveBeenCalledWith(expect.objectContaining({
        fullName: testFullName,
        pin: 'hashed_value', // Assuming bcrypt mock returns 'hashed_value'
        role: 'STUDENT',
        adminId: adminId,
        age: testAge,
        readingLevel: testReadingLevel,
      }));

      expect(result).toEqual(mockCreatedProfile);
    });

    it('should throw error if profile creation fails (DB error)', async () => {
      // Override subscription mock for THIS test to allow creation attempt
      const paidPlan: SubscriptionPlanSchema = { ...mockPlan, tier: 'home' as const }; 
      vi.mocked(SubscriptionService.prototype.getCurrentSubscription).mockResolvedValueOnce({ plan: paidPlan, subscription: null });
      
      mockReturning.mockReset(); // Reset from beforeEach
      mockReturning.mockRejectedValueOnce(new Error('DB insert failed'));

      await expect(authService.createStudent(adminId, testFullName, testPin, testAge, testReadingLevel))
          .rejects.toThrow('Failed to create student: DB insert failed');
      // Check logger call (original error is logged)
      expect(logger.error).toHaveBeenCalledWith("Error creating student profile:", new Error('DB insert failed'));
    });
  });

  // --- Tests for loginStudent ---
  describe('loginStudent', () => {
    const studentId = 'student-profile-id'; // Use the actual profile ID
    const correctPin = '1234';
    const hashedPin = 'hashed_pin'; // Matches helper default
    const adminId = 'admin-uuid'; // Example adminId
    const mockStudentProfile = createMockProfile({
        id: studentId, 
        adminId: adminId, 
        role: "STUDENT", 
        pin: hashedPin // Ensure pin is set for compare
    });

    it('should return Profile if student found, is STUDENT, and PIN matches', async () => {
        // Define select mock that properly matches the service implementation
        mockDb.select = vi.fn().mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce([mockStudentProfile])
          })
        }) as any;
        
        (bcrypt.compare as Mock) = vi.fn().mockImplementation(async () => Promise.resolve(true));
        const result = await authService.loginStudent(studentId, correctPin);

        expect(mockDb.select).toHaveBeenCalled();
        expect(bcrypt.compare as Mock).toHaveBeenCalledWith(correctPin, mockStudentProfile.pin);
        expect(result).toEqual({ 
            profile: mockStudentProfile, 
            token: expect.any(String) 
        });
    });

    it('should throw error if student profile not found', async () => {
        // Define select mock with empty result array
        mockDb.select = vi.fn().mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce([])
          })
        }) as any;

        await expect(authService.loginStudent(studentId, correctPin))
            .rejects.toThrow('Student profile not found');
    });

    it('should throw error if profile is not a STUDENT', async () => {
        // Define select mock with admin profile
        const adminProfile = createMockProfile({ id: studentId, adminId: adminId, role: "ADMIN", pin: hashedPin }); 
        mockDb.select = vi.fn().mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce([adminProfile])
          })
        }) as any;

        await expect(authService.loginStudent(studentId, correctPin))
            .rejects.toThrow('Student profile not found');
    });

    it('should throw error if PIN does not match', async () => {
        // Define select mock with student profile
        mockDb.select = vi.fn().mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce([mockStudentProfile])
          })
        }) as any;

        (bcrypt.compare as Mock) = vi.fn().mockImplementation(async () => Promise.resolve(false));
        await expect(authService.loginStudent(studentId, 'wrongPin'))
            .rejects.toThrow('Invalid PIN');
        expect(bcrypt.compare as Mock).toHaveBeenCalledWith('wrongPin', mockStudentProfile.pin);
    });

    it('should throw error if fetched profile has null pin', async () => {
        // Define select mock with profile missing pin
        const profileNoPin = createMockProfile({ id: studentId, adminId: adminId, role: "STUDENT", pin: null });
        mockDb.select = vi.fn().mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce([profileNoPin])
          })
        }) as any;

        await expect(authService.loginStudent(studentId, correctPin))
            .rejects.toThrow('Student profile data is invalid.');
        expect(bcrypt.compare as Mock).not.toHaveBeenCalled();
    });

    it('should throw error if fetched student profile has null adminId', async () => {
        // Define select mock with profile missing adminId
        const profileNoAdminId = createMockProfile({ id: studentId, adminId: null, role: "STUDENT", pin: hashedPin });
        mockDb.select = vi.fn().mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce([profileNoAdminId])
          })
        }) as any;

        await expect(authService.loginStudent(studentId, correctPin))
            .rejects.toThrow('Student profile data is invalid.');
        expect(bcrypt.compare as Mock).not.toHaveBeenCalled();
    });

  });

  // --- Tests for logout ---
  describe('logout', () => {
    it('should call Supabase signOut and resolve successfully', async () => {
      (mockSupabase.auth.signOut as Mock).mockResolvedValue({ error: null });
      
      await expect(authService.logout()).resolves.toBeUndefined();
      expect(mockSupabase.auth.signOut).toHaveBeenCalledOnce();
    });

    it('should throw wrapped error if Supabase signOut fails', async () => {
      const authError = new AuthError('Sign out failed');
      (mockSupabase.auth.signOut as Mock).mockResolvedValue({ error: authError });

      await expect(authService.logout()).rejects.toThrow(`Logout failed: ${authError.message}`);
    });
  });


  // --- Tests for resetStudentPin ---
  describe('resetStudentPin', () => {
    const studentUserId = 'student-uuid';
    const newPin = '9876';
    const updatedProfile = createMockProfile({ id: studentUserId, pin: 'hashed_value', updatedAt: new Date() });

    it('should hash new PIN, update student profile with updatedAt, and return updated profile', async () => {
        mockReturning.mockResolvedValueOnce([updatedProfile]);
        const result = await authService.resetStudentPin(studentUserId, newPin);
        expect(bcrypt.hash as Mock).toHaveBeenCalledWith(newPin, 10);
        expect(mockDb.update).toHaveBeenCalledWith(profiles);
        expect(mockReturning).toHaveBeenCalledOnce();
        expect(result).toEqual(updatedProfile);
    });

     it('should throw error if DB update returns empty (student not found)', async () => {
        mockReturning.mockResolvedValueOnce([]); // Simulate not found

        await expect(authService.resetStudentPin(studentUserId, newPin))
            .rejects.toThrow('Student profile not found during PIN reset.');
    });

    it('should throw wrapped error if DB update operation fails', async () => {
        const dbError = new Error('DB update failed');
        mockReturning.mockRejectedValueOnce(dbError);

        await expect(authService.resetStudentPin(studentUserId, newPin))
            .rejects.toThrow(`Failed to reset student PIN: ${dbError.message}`);
    });
  });
  
  // --- Tests for resetAdminPassword ---
  describe('resetAdminPassword', () => {
    const adminId = 'admin-uuid';
    const currentPassword = 'oldPassword123'; // Current pass needed for Supabase verification
    const newPassword = 'newPassword123';
    const mockUser = { id: adminId, email: 'admin@test.com' } as User; // Mock Supabase user 
    const updatedProfile = createMockProfile({ id: adminId, updatedAt: new Date() }); // Expected result from DB

    beforeEach(() => {
      // Re-initialize mocks correctly within beforeEach
      mockSupabase.auth = {
          ...(mockSupabase.auth || {}), // Preserve other potential mocks
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
          signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }), 
          updateUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
          signOut: vi.fn().mockResolvedValue({ error: null }), 
      } as any; // Cast to 'any' to bypass strict type checking
      
      // Mock DB select for the final profile fetch
      mockDb.select = vi.fn().mockImplementation(() => ({ 
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockReturnValueOnce([updatedProfile])
        }))
      })) as any;
    });

    it('should verify current password, update via Supabase, fetch profile, and return updated profile', async () => {
      // Removed mock for bcrypt.hash
      (mockSupabase.auth.updateUser as Mock) = vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null });
      
      const result = await authService.resetAdminPassword(adminId, currentPassword, newPassword);
      
      // Removed expect for bcrypt.hash
      // Corrected expectation for updateUser argument
      expect(mockSupabase.auth.updateUser as Mock).toHaveBeenCalledWith({ password: newPassword });
      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(updatedProfile);
    });

    it('should throw error if current password is incorrect', async () => {
      const authError = new AuthError('Invalid current password');
      (mockSupabase.auth.signInWithPassword as Mock).mockResolvedValue({ data: { user: null, session: null }, error: authError });
      
      // Corrected expected error message
      await expect(authService.resetAdminPassword(adminId, currentPassword, newPassword))
          .rejects.toThrow('Current password is incorrect.');
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should throw error if Supabase update fails', async () => {
      const dbError = new Error('Supabase update failed'); // Keep original error for mocking
      (mockSupabase.auth.updateUser as Mock) = vi.fn().mockRejectedValue(dbError);
      
      // Corrected expected error message
      await expect(authService.resetAdminPassword(adminId, currentPassword, newPassword))
          .rejects.toThrow('Failed to reset admin password.'); // Expect the generic AppError message
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });
}); 
