import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, asc, desc, sql, inArray } from 'drizzle-orm';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

// Define the type for the db instance based on the imported value
type DbInstanceType = typeof db;

// Define explicit type alias for paragraph submissions
type ParagraphSubmission = typeof schema.paragraphSubmissions.$inferSelect;
// Define explicit type alias for student progress
type StudentProgress = typeof schema.studentProgress.$inferSelect;

// Define the structure for input data when creating/starting progress
// Note: This should likely only contain studentId and moduleId
export interface CreateProgressInput {
  studentId: string;
  moduleId: string;
  // score?: number | null; // Score likely assigned later
  // timeSpentMinutes?: number | null; // Time spent likely updated later
}

// Define the structure for updating a progress record (e.g., by admin)
export interface UpdateProgressInput {
  completed?: boolean;
  score?: number | null;
  timeSpentMinutes?: number | null;
  teacherFeedback?: string | null;
}

// --- Interface for Paragraph Summary Submission ---
export interface SubmitParagraphSummaryInput {
  studentId: string;
  moduleId: string;
  paragraphIndex: number;
  paragraphSummary: string;
  cumulativeSummary: string;
}

// --- Type alias for Detailed Progress Response ---
export type DetailedProgressAdminResponse = {
  progress: StudentProgress | null;
  submissions: ParagraphSubmission[];
}

export class ProgressService {
  private db: DbInstanceType;

  constructor(db: DbInstanceType) {
    this.db = db;
  }

  // --- Helper for Authorization Check (Admin manages Student) ---
  private async verifyAdminManagesStudent(adminId: string, studentId: string): Promise<void> {
    try {
      const studentProfile = await this.db.query.profiles.findFirst({
        columns: { id: true, adminId: true, role: true },
        where: eq(schema.profiles.id, studentId)
      });

      if (!studentProfile) {
        throw new AppError('Student profile not found', 404);
      }

      // Check if the profile is indeed a student and managed by the given admin
      if (studentProfile.role !== 'STUDENT' || studentProfile.adminId !== adminId) {
        // TODO: Consider if SuperAdmin should bypass this check
        // const requestingAdmin = await this.db.query.profiles.findFirst({ where: eq(schema.profiles.id, adminId), columns: { role: true } });
        // if (requestingAdmin?.role === 'SUPER_ADMIN') { /* allow */ } else { throw ... }
        logger.warn('Admin permission denied to access student progress', { adminId, studentId });
        throw new AppError('Forbidden: You do not manage this student', 403);
      }
    } catch (error: any) {
      if (error instanceof AppError) throw error; // Re-throw known errors
      logger.error('Error verifying admin-student relationship', { adminId, studentId, error: error?.message });
      throw new AppError('Error verifying admin permission', 500);
    }
  }
  // --- End Helper ---

  /**
   * Start tracking progress for a student on a reading module.
   * Creates a progress record if one doesn't exist. Idempotent.
   */
  async startProgress(input: CreateProgressInput): Promise<StudentProgress> {
    const { studentId, moduleId } = input;
    try {
      const existingProgress = await this.db.query.studentProgress.findFirst({
        where: and(
          eq(schema.studentProgress.studentId, studentId),
          eq(schema.studentProgress.moduleId, moduleId)
        ),
      });

      if (existingProgress) {
        logger.info('Progress already started, returning existing record', { studentId, moduleId, progressId: existingProgress.id });
        return existingProgress;
      }

      const student = await this.db.query.profiles.findFirst({ columns: { id: true }, where: eq(schema.profiles.id, studentId) });
      if (!student) throw new AppError('Student not found', 404);

      const module = await this.db.query.readingModules.findFirst({ columns: { id: true }, where: eq(schema.readingModules.id, moduleId) });
      if (!module) throw new AppError('Reading module not found', 404);

      const now = new Date();
      const [newProgress] = await this.db
        .insert(schema.studentProgress)
        .values({
          studentId,
          moduleId,
          startedAt: now,
          highestParagraphIndexReached: 0, 
          completed: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!newProgress) {
        throw new AppError('Failed to create progress record after checks.', 500);
      }
      logger.info('Progress started successfully', { studentId, moduleId, progressId: newProgress.id });
      return newProgress;

    } catch (error: any) {
      if (error instanceof AppError) throw error;
      logger.error('Error starting progress tracking:', { studentId, moduleId, error: error?.message });
      throw new AppError('Failed to start progress tracking', 500);
    }
  }

  /**
   * Handles the submission of a summary for a specific paragraph.
   * Updates overall progress, including completion status and final summary.
   */
  async submitParagraphSummary(input: SubmitParagraphSummaryInput): Promise<{
    submission: ParagraphSubmission;
    progress: StudentProgress
  }> {
    const {
      studentId,
      moduleId,
      paragraphIndex,
      paragraphSummary,
      cumulativeSummary
    } = input;

    if (!studentId || !moduleId || !paragraphIndex || paragraphIndex <= 0 || !paragraphSummary || !cumulativeSummary) {
      throw new AppError('Missing required fields for paragraph submission.', 400);
    }

    try {
      const progressRecord = await this.db.query.studentProgress.findFirst({
        where: and(
          eq(schema.studentProgress.studentId, studentId),
          eq(schema.studentProgress.moduleId, moduleId)
        ),
      });

      if (!progressRecord) {
        logger.warn('Attempted to submit summary for non-existent progress record', { studentId, moduleId });
        throw new AppError('Progress not started for this module. Cannot submit summary.', 404);
      }

      if (progressRecord.completed) {
           throw new AppError('Module already completed. Cannot submit further summaries.', 400);
      }

      const moduleData = await this.db.query.readingModules.findFirst({
        columns: { paragraphCount: true },
        where: eq(schema.readingModules.id, moduleId),
      });

      if (!moduleData || typeof moduleData.paragraphCount !== 'number' || moduleData.paragraphCount <= 0) {
         logger.error('Module data not found or invalid paragraph count', { moduleId });
        throw new AppError('Module data not found or invalid paragraph count.', 404);
      }
      const totalParagraphs = moduleData.paragraphCount;

      const [newSubmission] = await this.db
        .insert(schema.paragraphSubmissions)
        .values({
          studentProgressId: progressRecord.id,
          paragraphIndex,
          paragraphSummary,
          cumulativeSummary,
          submittedAt: new Date(), 
        })
        .returning();

      if (!newSubmission) {
        throw new AppError('Failed to save paragraph submission.', 500);
      }

      const updatesToProgress: Partial<StudentProgress> = {
        updatedAt: new Date(),
      };

      if (paragraphIndex > (progressRecord.highestParagraphIndexReached || 0)) {
        updatesToProgress.highestParagraphIndexReached = paragraphIndex;
      }

      let isComplete = false;
      if (paragraphIndex >= totalParagraphs) {
        updatesToProgress.completed = true;
        updatesToProgress.completedAt = new Date();
        updatesToProgress.finalSummary = cumulativeSummary; 
        isComplete = true;
      }

      const [updatedProgress] = await this.db
        .update(schema.studentProgress)
        .set(updatesToProgress)
        .where(eq(schema.studentProgress.id, progressRecord.id))
        .returning();

      if (!updatedProgress) {
           logger.error('Failed to update progress record after successful submission insert', { progressId: progressRecord.id });
           throw new AppError('Failed to update overall progress record after summary submission.', 500);
      }

      logger.info('Paragraph summary submitted successfully', {
          studentId, moduleId, paragraphIndex, submissionId: newSubmission.id, progressId: updatedProgress.id, completed: isComplete
      });

      return { submission: newSubmission, progress: updatedProgress };

    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error submitting paragraph summary:', { 
        studentId: input.studentId, 
        moduleId: input.moduleId, 
        paragraphIndex: input.paragraphIndex, 
        error: error?.message 
      });
      throw new AppError('Failed to submit paragraph summary.', 500);
    }
  }

  /**
   * Update an existing progress record (e.g., by admin for feedback/score).
   * This method should NOT be used by students submitting summaries.
   */
  async updateProgress(
    progressId: string,
    updates: UpdateProgressInput,
    isAdminUpdate: boolean = false
  ): Promise<StudentProgress> {
    const updatePayload: Partial<StudentProgress> = { ...updates };
    updatePayload.updatedAt = new Date();

    // Set teacherFeedbackAt if feedback is being provided in this admin update
    if (isAdminUpdate && updates.teacherFeedback !== undefined) {
      updatePayload.teacherFeedbackAt = new Date();
    }

    try {
      const [updatedProgress] = await this.db
        .update(schema.studentProgress)
        .set(updatePayload)
        .where(eq(schema.studentProgress.id, progressId))
        .returning();

      if (!updatedProgress) {
        throw new AppError('Progress record not found or update failed', 404);
      }
      logger.info('Progress record updated', { progressId, byAdmin: isAdminUpdate });
      return updatedProgress;

    } catch (error: any) {
       if (error instanceof AppError) throw error;
       logger.error('Error updating progress record:', { progressId, updateKeys: Object.keys(updates), isAdminUpdate, error: error?.message });
       throw new AppError('Failed to update progress record', 500);
    }
  }

  /**
   * Get detailed progress for a student on a specific module, including all paragraph submissions.
   */
  async getStudentProgressDetails(studentId: string, moduleId: string): Promise<DetailedProgressAdminResponse> {
    try {
        const progress = await this.db.query.studentProgress.findFirst({
        where: and(
          eq(schema.studentProgress.studentId, studentId),
          eq(schema.studentProgress.moduleId, moduleId)
        ),
      });

        if (!progress) {
            // It's not necessarily an error if progress hasn't started
        return { progress: null, submissions: [] };
      }

      const submissions = await this.db.query.paragraphSubmissions.findMany({
            where: eq(schema.paragraphSubmissions.studentProgressId, progress.id),
            orderBy: [asc(schema.paragraphSubmissions.paragraphIndex)], // Order submissions
        });

        return { progress, submissions };
    } catch (error: any) {
        logger.error('Error fetching student progress details:', { studentId: studentId, moduleId: moduleId, error: error?.message });
        throw new AppError('Failed to fetch student progress details', 500);
    }
  }

  /**
   * FOR STUDENT: Get a single progress record for a module.
   */
  async getStudentModuleProgress(studentId: string, moduleId: string): Promise<StudentProgress | null> {
    try {
      const progress = await this.db.query.studentProgress.findFirst({
        where: and(
          eq(schema.studentProgress.studentId, studentId),
          eq(schema.studentProgress.moduleId, moduleId)
        ),
      });
      return progress ?? null;
    } catch (error: any) {
      logger.error('Error fetching student module progress:', { studentId: studentId, moduleId: moduleId, error: error?.message });
      throw new AppError('Failed to fetch student module progress', 500);
    }
  }

  /**
   * FOR STUDENT: Get all progress records for the student.
   */
  async getAllStudentProgress(studentId: string): Promise<StudentProgress[]> {
    try {
      const progressList = await this.db.query.studentProgress.findMany({
         where: eq(schema.studentProgress.studentId, studentId),
        // Optional: Add ordering, e.g., by module title or updated date
        orderBy: [desc(schema.studentProgress.updatedAt)] 
      });
      return progressList;
    } catch (error: any) {
      logger.error('Error fetching all student progress:', { studentId: studentId, error: error?.message });
      throw new AppError('Failed to fetch all student progress', 500);
    }
  }

  /**
   * FOR ADMIN (CURRENT): Get all progress records for a specific module.
   * Note: Does not filter by student.
   */
   async getAllModuleProgress(moduleId: string): Promise<StudentProgress[]> {
    try {
      const progressList = await this.db.query.studentProgress.findMany({
         where: eq(schema.studentProgress.moduleId, moduleId),
        // Optional: Add ordering, e.g., by student name (requires join)
      });
      return progressList;
    } catch (error: any) {
      logger.error('Error fetching all module progress:', { moduleId: moduleId, error: error?.message });
      throw new AppError('Failed to fetch all module progress', 500);
    }
  }

   /**
    * Generic fetch by progress ID.
    */
   async getProgressById(progressId: string): Promise<StudentProgress | null> {
     try {
       const progress = await this.db.query.studentProgress.findFirst({
        where: eq(schema.studentProgress.id, progressId),
       });
       return progress ?? null;
    } catch (error: any) {
      logger.error('Error fetching progress by ID:', { progressId: progressId, error: error?.message });
      throw new AppError('Failed to fetch progress by ID', 500);
    }
  }

   /**
    * Deprecated? Fetches all progress for students managed by an admin.
    * Might be inefficient. Prefer fetching by student or module.
    */
   async getAdminStudentsProgress(adminId: string): Promise<StudentProgress[]> {
      logger.warn('getAdminStudentsProgress called - consider performance implications', { adminId });
      try {
          // Find student IDs managed by the admin
          const students = await this.db.query.profiles.findMany({
              columns: { id: true },
              where: and(eq(schema.profiles.adminId, adminId), eq(schema.profiles.role, 'STUDENT')),
          });

          const studentIds = students.map(s => s.id);
          if (studentIds.length === 0) {
              return []; // No students found for this admin
          }

          // Drizzle v0.20+ supports inArray operator directly
          const progressList = await this.db
              .select()
              .from(schema.studentProgress)
              .where(inArray(schema.studentProgress.studentId, studentIds)); 
          
          return progressList;
      } catch (error: any) {
          logger.error('Error fetching progress for admin\'s students:', { adminId: adminId, error: error?.message });
          throw new AppError('Failed to fetch progress for admin\'s students', 500);
      }
   }

   // --- NEW METHODS FOR ADMIN ACCESS ---

   /**
    * FOR ADMIN: Get all progress records for a specific student they manage.
    */
   async getStudentProgressForAdmin(adminId: string, studentId: string): Promise<StudentProgress[]> {
      logger.info('Fetching all progress for student by admin', { adminId, studentId });
      await this.verifyAdminManagesStudent(adminId, studentId); // Authorization check

      try {
        // Fetch progress after authorization
        const progressList = await this.db.query.studentProgress.findMany({
          where: eq(schema.studentProgress.studentId, studentId),
          orderBy: [desc(schema.studentProgress.updatedAt)] // Example ordering
        });
        return progressList;
      } catch (error: any) {
        // Don't re-throw AppError from verifyAdminManagesStudent
        if (!(error instanceof AppError)) {
            logger.error('Error fetching student progress for admin after verification:', { adminId, studentId, error: error?.message });
            throw new AppError('Failed to fetch student progress for admin', 500);
        }
        // If it was an AppError from the verification helper, re-throw it
        throw error;
      }
   }

   /**
    * FOR ADMIN: Get detailed progress for a specific module for a student they manage.
    */
   async getDetailedStudentModuleProgressForAdmin(adminId: string, studentId: string, moduleId: string): Promise<DetailedProgressAdminResponse> {
      logger.info('Fetching detailed module progress for student by admin', { adminId, studentId, moduleId });
      await this.verifyAdminManagesStudent(adminId, studentId); // Authorization check

      try {
        // Fetch details after authorization (similar to getStudentProgressDetails)
        const progress = await this.db.query.studentProgress.findFirst({
            where: and(
                eq(schema.studentProgress.studentId, studentId),
                eq(schema.studentProgress.moduleId, moduleId)
            ),
        });

        if (!progress) {
            // If admin manages student but no progress on this module, return empty structure
            logger.warn('No progress found for this student/module combination', { studentId, moduleId });
            return { progress: null, submissions: [] };
        }

        const submissions = await this.db.query.paragraphSubmissions.findMany({
            where: eq(schema.paragraphSubmissions.studentProgressId, progress.id),
            orderBy: [asc(schema.paragraphSubmissions.paragraphIndex)],
        });

        return { progress, submissions };
      } catch (error: any) {
          // Don't re-throw AppError from verifyAdminManagesStudent
          if (!(error instanceof AppError)) {
              logger.error('Error fetching detailed student module progress for admin after verification:', { adminId, studentId, moduleId, error: error?.message });
              throw new AppError('Failed to fetch detailed student module progress for admin', 500);
          }
          // If it was an AppError from the verification helper, re-throw it
          throw error;
      }
   }
   // --- END NEW METHODS ---
} 