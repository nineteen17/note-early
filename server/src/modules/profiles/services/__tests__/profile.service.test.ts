// src/modules/users/services/__tests__/profile.service.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { ProfileService } from '../profile.service';
import { eq, and } from 'drizzle-orm';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { ReadingLevel, UserRole } from '@shared/types';

// Ensure the real implementation of AppError is used (if you previously mocked it, unmock it)
vi.unmock('@/utils/errors');

// --- Helpers & Mocks ---

// Example test UUIDs for clarity.
const testUUIDs = {
  admin1: 'admin-uuid-1',
  student1: 'student-uuid-1',
  profile1: 'profile-uuid-1',
  notFound: 'non-existent-id'
};

// Create a mock database profile object.
function createMockDbProfile(overrides: Partial<any> = {}) {
  return {
    id: testUUIDs.profile1,
    email: 'test@example.com',
    fullName: 'Test User',
    avatarUrl: null,
    role: UserRole.STUDENT,
    adminId: testUUIDs.admin1,
    createdAt: new Date('2025-04-14T06:34:13.000Z'),
    updatedAt: new Date('2025-04-14T06:34:13.000Z'),
    age: 10,
    readingLevel: ReadingLevel.LEVEL_2,
    pin: 'hashed_pin',
    stripeCustomerId: null,
    subscriptionStatus: null,
    subscriptionPlan: null,
    subscriptionRenewalDate: null,
    ...overrides,
  };
}

// Create the DTO that the ProfileService’s mapToProfileDTO is expected to return.
function createMockProfileDTO(dbProfile: any) {
  const dto: any = {
    profileId: dbProfile.id,
    email: dbProfile.email,
    fullName: dbProfile.fullName,
    avatarUrl: dbProfile.avatarUrl,
    role: dbProfile.role,
    createdAt: dbProfile.createdAt,
    updatedAt: dbProfile.updatedAt,
  };
  if (dbProfile.role === UserRole.STUDENT) {
    dto.age = dbProfile.age;
    dto.readingLevel = dbProfile.readingLevel;
  }
  return dto;
}

// --- Tests for ProfileService ---

describe('ProfileService', () => {
  let profileService: ProfileService;

  // Mock the low-level db methods. (Adjust these mocks as needed.)
  const mockExecute = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    // Set up the db.select, db.insert, db.update, and db.delete mocks.
    (db.select as any) = vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      execute: mockExecute,
    }));
    (db.insert as any) = vi.fn(() => ({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      execute: mockExecute,
    }));
    (db.update as any) = vi.fn(() => ({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      execute: mockExecute,
    }));
    (db.delete as any) = vi.fn(() => ({
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      execute: mockExecute,
    }));

    profileService = new ProfileService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // --- getProfileById Tests ---
  describe('getProfileById', () => {
    it('should return a profile if found', async () => {
      const mockDbProfile = createMockDbProfile();
      mockExecute.mockResolvedValueOnce([mockDbProfile]);

      const result = await profileService.getProfileById(mockDbProfile.id);
      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(createMockProfileDTO(mockDbProfile));
    });

    it('should throw AppError if profile not found', async () => {
      mockExecute.mockResolvedValueOnce([]);
      await expect(profileService.getProfileById(testUUIDs.notFound))
        .rejects.toThrowError(new AppError('Profile not found', 404));
    });

    it('should throw AppError if query fails', async () => {
      const dbError = new Error('Query timeout');
      mockExecute.mockRejectedValueOnce(dbError);
      await expect(profileService.getProfileById('any-id'))
        .rejects.toThrowError(new AppError('Failed to fetch profile', 500));
    });
  });

  // --- updateProfile Tests ---
  describe('updateProfile', () => {
    const userId = testUUIDs.profile1;
    const requestingUserId = userId;
    const updateData = { fullName: 'Updated Name', avatarUrl: 'http://new.avatar.url/img.png' };

    it('should update profile (self-update) and return mapped DTO', async () => {
      const existingProfile = createMockDbProfile({ id: userId, role: UserRole.ADMIN, adminId: null });
      // Simulate the initial fetch returning the existing profile...
      mockExecute.mockResolvedValueOnce([existingProfile]);
      // ...and then the update query returns the updated profile.
      const updatedProfile = { ...existingProfile, ...updateData, updatedAt: new Date() };
      mockExecute.mockResolvedValueOnce([updatedProfile]);

      const result = await profileService.updateProfile(userId, updateData, requestingUserId, false);
      expect(result).toEqual(createMockProfileDTO(updatedProfile));
    });

    it('should throw AppError if no valid fields provided for self-update', async () => {
      const sensitiveUpdate = { role: UserRole.SUPER_ADMIN, age: 99 } as any;
      const existingProfile = createMockDbProfile({ id: userId, role: UserRole.ADMIN, adminId: null });
      mockExecute.mockResolvedValueOnce([existingProfile]);

      await expect(profileService.updateProfile(userId, sensitiveUpdate, requestingUserId, false))
        .rejects.toThrowError(new AppError('No valid fields provided for update', 400));
    });

    it('should throw AppError if profile not found during initial fetch', async () => {
      mockExecute.mockResolvedValueOnce([]);
      await expect(profileService.updateProfile(userId, updateData, requestingUserId, false))
        .rejects.toThrowError(new AppError('Profile not found', 404));
    });

    it('should throw AppError if update query returns empty', async () => {
      const existingProfile = createMockDbProfile({ id: userId, role: UserRole.ADMIN, adminId: null });
      mockExecute.mockResolvedValueOnce([existingProfile]);
      mockExecute.mockResolvedValueOnce([]);
      await expect(profileService.updateProfile(userId, updateData, requestingUserId, false))
        .rejects.toThrowError(new AppError('Profile update failed', 500));
    });

    it('should throw AppError if update fails (DB error)', async () => {
      const existingProfile = createMockDbProfile({ id: userId, role: UserRole.ADMIN, adminId: null });
      const dbError = new Error('Database error');
      mockExecute.mockResolvedValueOnce([existingProfile]);
      mockExecute.mockRejectedValueOnce(dbError);
      await expect(profileService.updateProfile(userId, updateData, requestingUserId, false))
        .rejects.toThrowError(new AppError('Failed to update profile', 500));
    });

    it('should throw 403 if student tries to update own profile', async () => {
      const studentProfile = createMockDbProfile({ id: userId, role: UserRole.STUDENT });
      mockExecute.mockResolvedValueOnce([studentProfile]);
      await expect(profileService.updateProfile(userId, updateData, userId, false))
        .rejects.toThrowError(new AppError('Students cannot update their own profiles', 403));
    });
  });

  // --- ADMIN UPDATE (updateProfile with isAdmin flag) Tests ---
  describe('ADMIN UPDATE (updateProfile with isAdmin flag)', () => {
    const adminId = testUUIDs.admin1;
    const studentId = testUUIDs.student1;
    const updateData = { fullName: 'Student Updated Name', age: 12, readingLevel: ReadingLevel.LEVEL_4 };
    const studentProfile = createMockDbProfile({ id: studentId, role: UserRole.STUDENT, adminId: adminId });
    const updatedStudentProfile = { ...studentProfile, ...updateData, updatedAt: new Date() };

    it('should update student profile as admin and return DTO', async () => {
      // 1. Fetch the target student's profile.
      mockExecute.mockResolvedValueOnce([studentProfile]);
      // 2. Fetch requesting admin profile for authorization.
      mockExecute.mockResolvedValueOnce([{ role: UserRole.ADMIN }]);
      // 3. Run update query that returns updated profile.
      mockExecute.mockResolvedValueOnce([updatedStudentProfile]);

      const result = await profileService.updateProfile(studentId, updateData, adminId, true);
      expect(result).toEqual(createMockProfileDTO(updatedStudentProfile));
    });

    it('should throw 403 if requesting user is not admin', async () => {
      const notAdminId = testUUIDs.student1;
      mockExecute.mockResolvedValueOnce([studentProfile]);
      mockExecute.mockResolvedValueOnce([{ role: UserRole.STUDENT }]);
      await expect(profileService.updateProfile(studentId, updateData, notAdminId, true))
        .rejects.toThrowError(new AppError('Admin privileges required to update this profile', 403));
    });

    it('should throw 403 if target profile is not STUDENT', async () => {
      const targetAdminProfile = createMockDbProfile({ id: studentId, role: UserRole.ADMIN });
      mockExecute.mockResolvedValueOnce([targetAdminProfile]);
      await expect(profileService.updateProfile(studentId, updateData, adminId, true))
        .rejects.toThrowError(new AppError('Admin can only update students they manage', 403));
    });

    it('should throw 403 if admin does not manage the student', async () => {
      const wrongAdminId = 'wrong-admin-id';
      const studentManagedByOther = createMockDbProfile({ id: studentId, role: UserRole.STUDENT, adminId: wrongAdminId });
      mockExecute.mockResolvedValueOnce([studentManagedByOther]);
      mockExecute.mockResolvedValueOnce([{ role: UserRole.ADMIN }]);
      await expect(profileService.updateProfile(studentId, updateData, adminId, true))
        .rejects.toThrowError(new AppError('Admin can only update students they manage', 403));
    });
  });

  // --- deleteProfile Tests ---
  describe('deleteProfile', () => {
    const adminId = testUUIDs.admin1;
    const studentId = testUUIDs.student1;
    const studentProfile = createMockDbProfile({ id: studentId, role: UserRole.STUDENT, adminId: adminId });
    const minimalProfileForCheck = {
      id: studentId,
      adminId: adminId,
      email: studentProfile.email,
      role: studentProfile.role,
    };

    it('should delete a student profile as admin and return DTO', async () => {
      // First, fetch minimal profile data for authorization.
      mockExecute.mockResolvedValueOnce([minimalProfileForCheck]);
      // Then, perform deletion and get full deleted profile.
      mockExecute.mockResolvedValueOnce([studentProfile]);

      const result = await profileService.deleteProfile(studentId, adminId);
      expect(result).toEqual(createMockProfileDTO(studentProfile));
    });

    it('should throw AppError if profile to delete is not found', async () => {
      mockExecute.mockResolvedValueOnce([]);
      await expect(profileService.deleteProfile('non-existent', adminId))
        .rejects.toThrowError(new AppError('Profile not found', 404));
    });

    it('should throw AppError if admin does not manage the profile', async () => {
      const wrongAdminId = 'wrong-admin-id';
      mockExecute.mockResolvedValueOnce([minimalProfileForCheck]);
      await expect(profileService.deleteProfile(studentId, wrongAdminId))
        .rejects.toThrowError(new AppError('Unauthorized: Profile is not managed by this admin', 403));
    });

    it('should throw AppError if deletion fails (DB error)', async () => {
      mockExecute.mockResolvedValueOnce([minimalProfileForCheck]);
      mockExecute.mockRejectedValueOnce(new Error('DB delete error'));
      await expect(profileService.deleteProfile(studentId, adminId))
        .rejects.toThrowError(new AppError('Failed to delete profile', 500));
    });
  });

  // --- getProfilesByAdminId Tests ---
  describe('getProfilesByAdminId', () => {
    it('should return mapped profiles for a given admin ID', async () => {
      const adminId = testUUIDs.admin1;
      const profile1 = createMockDbProfile({ id: 'p1', adminId: adminId, role: UserRole.STUDENT });
      const profile2 = createMockDbProfile({ id: 'p2', adminId: adminId, role: UserRole.STUDENT });
      const expectedDTOs = [createMockProfileDTO(profile1), createMockProfileDTO(profile2)];
      mockExecute.mockResolvedValueOnce([profile1, profile2]);

      const result = await profileService.getProfilesByAdminId(adminId);
      expect(result).toEqual(expectedDTOs);
    });

    it('should throw AppError if query fails', async () => {
      const adminId = testUUIDs.admin1;
      mockExecute.mockRejectedValueOnce(new Error('DB error'));
      await expect(profileService.getProfilesByAdminId(adminId))
        .rejects.toThrowError(new AppError('Failed to fetch profiles', 500));
    });
  });

  // --- getAllStudents Tests ---
  describe('getAllStudents', () => {
    it('should return all mapped student profiles', async () => {
      const student1 = createMockDbProfile({ id: testUUIDs.student1, role: UserRole.STUDENT, adminId: testUUIDs.admin1 });
      const student2 = createMockDbProfile({ id: 'p2', role: UserRole.STUDENT, adminId: testUUIDs.admin1, email: 's2@test.com' });
      const expectedDTOs = [createMockProfileDTO(student1), createMockProfileDTO(student2)];
      mockExecute.mockResolvedValueOnce([student1, student2]);

      const result = await profileService.getAllStudents();
      expect(result).toEqual(expectedDTOs);
    });

    it('should return an empty array if no students exist', async () => {
      mockExecute.mockResolvedValueOnce([]);
      const result = await profileService.getAllStudents();
      expect(result).toEqual([]);
    });

    it('should throw AppError if query fails', async () => {
      mockExecute.mockRejectedValueOnce(new Error('DB connection error'));
      await expect(profileService.getAllStudents())
        .rejects.toThrowError(new AppError('Failed to fetch students', 500));
    });
  });

  // --- getProfilesByFilters Tests ---
  describe('getProfilesByFilters', () => {
    it('should fetch mapped profiles with combined filter criteria', async () => {
      const filters = { role: UserRole.STUDENT, adminId: testUUIDs.admin1 };
      const profile = createMockDbProfile({ id: 'p1', role: UserRole.STUDENT, adminId: filters.adminId });
      const expectedDTOs = [createMockProfileDTO(profile)];
      mockExecute.mockResolvedValueOnce([profile]);

      const result = await profileService.getProfilesByFilters(filters);
      expect(result).toEqual(expectedDTOs);
    });

    it('should handle a single filter condition', async () => {
      const filters = { role: UserRole.ADMIN };
      const profile = createMockDbProfile({ id: 'p1', role: UserRole.ADMIN });
      const expectedDTOs = [createMockProfileDTO(profile)];
      mockExecute.mockResolvedValueOnce([profile]);

      const result = await profileService.getProfilesByFilters(filters);
      expect(result).toEqual(expectedDTOs);
    });

    it('should return all mapped profiles when no filters are provided', async () => {
      const profile = createMockDbProfile();
      const expectedDTOs = [createMockProfileDTO(profile)];
      mockExecute.mockResolvedValueOnce([profile]);

      const result = await profileService.getProfilesByFilters({});
      expect(result).toEqual(expectedDTOs);
    });

    it('should throw AppError if query fails', async () => {
      const filters = { role: UserRole.STUDENT, adminId: testUUIDs.admin1 };
      mockExecute.mockRejectedValueOnce(new Error('DB query failed'));
      await expect(profileService.getProfilesByFilters(filters))
        .rejects.toThrowError(new AppError('Failed to fetch profiles by filters', 500));
    });
  });
});