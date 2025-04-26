import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

// Define the type for the db instance based on the imported value
type DbInstanceType = typeof db;

// Define explicit type alias for paragraph submissions
type ParagraphSubmission = typeof schema.paragraphSubmissions.$inferSelect;

// Define the structure for input data when creating/starting progress
// Note: This should likely only contain studentId and moduleId
export interface CreateProgressInput {
  studentId: string;
  moduleId: string;
  // score?: number | null; // Score likely assigned later
  // timeSpentMinutes?: number | null; // Time spent likely updated later
}

// Define the structure for updating a progress record (e.g., by teacher)
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

export class ProgressService {
  private db: DbInstanceType;

  constructor(db: DbInstanceType) {
    this.db = db;
  }

  /**
   * Start tracking progress for a student on a reading module.
   * Creates a progress record if one doesn't exist. Idempotent.
   */
  async startProgress(input: CreateProgressInput): Promise<schema.StudentProgress> {
    const { studentId, moduleId } = input;
    try {
      // Use findFirst for potentially existing records
      const existingProgress = await this.db.query.studentProgress.findFirst({
        where: and(
          eq(schema.studentProgress.studentId, studentId),
          eq(schema.studentProgress.moduleId, moduleId)
        ),
      });

      if (existingProgress) {
        logger.info('Progress already started, returning existing record', { studentId, moduleId, progressId: existingProgress.id });
        return existingProgress; // Return existing if found
      }

      // Check if student and module exist before creating
      const student = await this.db.query.profiles.findFirst({ columns: { id: true }, where: eq(schema.profiles.id, studentId) });
      if (!student) throw new AppError('Student not found', 404);

      const module = await this.db.query.readingModules.findFirst({ columns: { id: true }, where: eq(schema.readingModules.id, moduleId) });
      if (!module) throw new AppError('Reading module not found', 404);

      // Create new progress record
      const now = new Date();
      const [newProgress] = await this.db
        .insert(schema.studentProgress)
        .values({
          studentId,
          moduleId,
          startedAt: now,
          // Initialize other fields as needed
          highestParagraphIndexReached: 0, // Start at 0
          completed: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!newProgress) {
        // This case should be less likely with proper checks, but handle defensively
        throw new AppError('Failed to create progress record after checks.', 500);
      }
      logger.info('Progress started successfully', { studentId, moduleId, progressId: newProgress.id });
      return newProgress;

    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error starting progress tracking:', { studentId, moduleId, error });
      throw new AppError('Failed to start progress tracking', 500);
    }
  }

  /**
   * Handles the submission of a summary for a specific paragraph.
   * Updates overall progress, including completion status and final summary.
   */
  async submitParagraphSummary(input: SubmitParagraphSummaryInput): Promise<{
    submission: ParagraphSubmission; // Use type alias
    progress: schema.StudentProgress
  }> {
    const {
      studentId,
      moduleId,
      paragraphIndex,
      paragraphSummary,
      cumulativeSummary
    } = input;

    // Basic validation
    if (!studentId || !moduleId || !paragraphIndex || paragraphIndex <= 0 || !paragraphSummary || !cumulativeSummary) {
      throw new AppError('Missing required fields for paragraph submission.', 400);
    }

    try {
      // 1. Find the existing student progress record - MUST exist
      const progressRecord = await this.db.query.studentProgress.findFirst({
        where: and(
          eq(schema.studentProgress.studentId, studentId),
          eq(schema.studentProgress.moduleId, moduleId)
        ),
      });

      if (!progressRecord) {
        logger.warn('Attempted to submit summary for non-existent progress record', { studentId, moduleId });
        // Consider if frontend should call startProgress first if this happens
        throw new AppError('Progress not started for this module. Cannot submit summary.', 404);
      }

      // 2. Prevent re-submission for already completed modules
      if (progressRecord.completed) {
           throw new AppError('Module already completed. Cannot submit further summaries.', 400);
      }

      // 3. Get the total paragraph count for the module
      const moduleData = await this.db.query.readingModules.findFirst({
        columns: { paragraphCount: true }, // Only fetch required column
        where: eq(schema.readingModules.id, moduleId),
      });

      // Ensure module and paragraph count are valid
      if (!moduleData || typeof moduleData.paragraphCount !== 'number' || moduleData.paragraphCount <= 0) {
         logger.error('Module data not found or invalid paragraph count', { moduleId });
        throw new AppError('Module data not found or invalid paragraph count.', 404); // Or 500 if it indicates data inconsistency
      }
      const totalParagraphs = moduleData.paragraphCount;

      // Optional: Prevent submitting for paragraph index already submitted or skipping paragraphs?
      // Check if a submission for this index already exists:
      // const existingSubmission = await this.db.query.paragraphSubmissions.findFirst({
      //   where: and(
      //      eq(schema.paragraphSubmissions.studentProgressId, progressRecord.id),
      //      eq(schema.paragraphSubmissions.paragraphIndex, paragraphIndex)
      //   )
      // });
      // if (existingSubmission) {
      //    throw new AppError(`Summary for paragraph ${paragraphIndex} already submitted.`, 400);
      // }
      // Check for skipping:
      // if (paragraphIndex > (progressRecord.highestParagraphIndexReached || 0) + 1) {
      //    throw new AppError(`Cannot skip paragraphs. Please submit for paragraph ${(progressRecord.highestParagraphIndexReached || 0) + 1}.`, 400);
      // }


      // 4. Insert the new paragraph submission
      const [newSubmission] = await this.db
        .insert(schema.paragraphSubmissions)
        .values({
          studentProgressId: progressRecord.id,
          paragraphIndex,
          paragraphSummary,
          cumulativeSummary,
          submittedAt: new Date(), // Use DB default? No, set explicitly for consistency.
        })
        .returning();

      if (!newSubmission) {
        // This indicates a failure during the insert operation
        throw new AppError('Failed to save paragraph submission.', 500);
      }

      // 5. Update the main progress record
      const updatesToProgress: Partial<schema.StudentProgress> = {
        updatedAt: new Date(),
      };

      // Update highest index reached *only if* this submission's index is higher
      if (paragraphIndex > (progressRecord.highestParagraphIndexReached || 0)) {
        updatesToProgress.highestParagraphIndexReached = paragraphIndex;
      }

      // Check for module completion
      let isComplete = false;
      if (paragraphIndex >= totalParagraphs) {
        updatesToProgress.completed = true;
        updatesToProgress.completedAt = new Date();
        updatesToProgress.finalSummary = cumulativeSummary; // Store the final cumulative summary
        isComplete = true;
      }

      // Apply updates to the student_progress table
      const [updatedProgress] = await this.db
        .update(schema.studentProgress)
        .set(updatesToProgress)
        .where(eq(schema.studentProgress.id, progressRecord.id)) // Ensure update targets the correct record
        .returning();

      if (!updatedProgress) {
           // This would be highly unusual if progressRecord was found earlier
           logger.error('Failed to update progress record after successful submission insert', { progressId: progressRecord.id });
           throw new AppError('Failed to update overall progress record after summary submission.', 500);
      }

      logger.info('Paragraph summary submitted successfully', {
          studentId, moduleId, paragraphIndex, submissionId: newSubmission.id, progressId: updatedProgress.id, completed: isComplete
      });

      // Return the newly created submission and the updated progress record
      return { submission: newSubmission, progress: updatedProgress };

    } catch (error) {
      // Re-throw known AppErrors
      if (error instanceof AppError) {
        throw error;
      }
      // Log unexpected errors
      logger.error('Error submitting paragraph summary:', { input, error });
      throw new AppError('Failed to submit paragraph summary.', 500); // Generic error for unexpected issues
    }
  }


  /**
   * Update an existing progress record (e.g., by teacher for feedback/score).
   * This method should NOT be used by students submitting summaries.
   */
  async updateProgress(
    progressId: string,
    updates: UpdateProgressInput, // Input type excludes summary fields
    isTeacherUpdate: boolean = false // Flag for tracking teacher feedback time
  ): Promise<schema.StudentProgress> {
    try {
      // Find the record first to ensure it exists
      const existingProgress = await this.db.query.studentProgress.findFirst({
        where: eq(schema.studentProgress.id, progressId),
      });

      if (!existingProgress) {
        throw new AppError('Progress record not found', 404);
      }

      // Prepare the update object, only including allowed fields
      const updatesToSend: Partial<schema.StudentProgress> = {
        updatedAt: new Date(), // Always update the timestamp
      };
      if (updates.completed !== undefined) updatesToSend.completed = updates.completed;
      if (updates.score !== undefined) updatesToSend.score = updates.score;
      if (updates.timeSpentMinutes !== undefined) updatesToSend.timeSpentMinutes = updates.timeSpentMinutes;
      if (updates.teacherFeedback !== undefined) updatesToSend.teacherFeedback = updates.teacherFeedback;

      // If marking as completed via this method (e.g., override), set completedAt
      // Avoid overwriting if already completed
      if (updates.completed && !existingProgress.completed) {
        updatesToSend.completedAt = new Date();
      }

      // If teacher is providing feedback, set teacherFeedbackAt timestamp
      if (isTeacherUpdate && updates.teacherFeedback) {
        updatesToSend.teacherFeedbackAt = new Date();
      }

      // Check if there's anything actually being updated besides updatedAt
       if (Object.keys(updatesToSend).length <= 1) {
         logger.warn('Update progress called with no effective changes.', { progressId });
         return existingProgress; // Return existing record if no changes
       }

      // Perform the update
      const [result] = await this.db
        .update(schema.studentProgress)
        .set(updatesToSend)
        .where(eq(schema.studentProgress.id, progressId))
        .returning();

      if (!result) {
         // Should be rare if existingProgress was found
        throw new AppError('Failed to update progress record after finding it.', 500);
      }
      logger.info('Progress record updated', { progressId, byTeacher: isTeacherUpdate });
      return result;

    } catch (error) {
      if (error instanceof AppError) throw error; // Re-throw known errors
      logger.error('Error updating progress:', { progressId, updates, error });
      throw new AppError('Failed to update progress', 500); // Generic error
    }
  }

  /**
   * Get detailed progress for a student on a specific module, including all paragraph submissions.
   */
  async getStudentProgressDetails(studentId: string, moduleId: string): Promise<{
    progress: schema.StudentProgress | null;
    submissions: ParagraphSubmission[]; // Use type alias
  }> {
    if (!studentId || !moduleId) {
      throw new AppError('Student ID and Module ID are required.', 400);
    }

    try {
      // 1. Get the main progress record
      const progressRecord = await this.db.query.studentProgress.findFirst({
        where: and(
          eq(schema.studentProgress.studentId, studentId),
          eq(schema.studentProgress.moduleId, moduleId)
        ),
      });

      // If no progress record exists, return null progress and empty submissions
      if (!progressRecord) {
        return { progress: null, submissions: [] };
      }

      // 2. Get all associated paragraph submissions, ordered by index
      const submissions = await this.db.query.paragraphSubmissions.findMany({
        where: eq(schema.paragraphSubmissions.studentProgressId, progressRecord.id),
        orderBy: [asc(schema.paragraphSubmissions.paragraphIndex)], // Order chronologically by paragraph
      });

      return { progress: progressRecord, submissions };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error getting student progress details:', { studentId, moduleId, error });
      throw new AppError('Failed to get student progress details.', 500);
    }
  }

  // --- Other Existing Get Methods (Review for summaryText removal - already done by schema change) ---

  async getStudentModuleProgress(studentId: string, moduleId: string): Promise<schema.StudentProgress | null> {
     // This method is fine, just returns the main progress record which no longer has summaryText
    try {
      const progress = await this.db.query.studentProgress.findFirst({
        where: and(
          eq(schema.studentProgress.studentId, studentId),
          eq(schema.studentProgress.moduleId, moduleId)
        )
      });
      return progress ?? null; // Use nullish coalescing
    } catch (error) {
      logger.error('Error getting student module progress:', { studentId, moduleId, error });
      throw new AppError('Failed to get student module progress', 500);
    }
  }

  async getAllStudentProgress(studentId: string): Promise<schema.StudentProgress[]> {
     // This method is fine
     try {
       const student = await this.db.query.profiles.findFirst({ columns: { id: true }, where: eq(schema.profiles.id, studentId) });
       if (!student) throw new AppError('Student not found', 404);

       return await this.db.query.studentProgress.findMany({
         where: eq(schema.studentProgress.studentId, studentId),
         orderBy: [desc(schema.studentProgress.updatedAt)] // Optional: order by most recent
       });
     } catch (error) {
       if (error instanceof AppError) throw error;
       logger.error('Error getting all student progress:', { studentId, error });
       throw new AppError('Failed to get student progress', 500);
     }
   }

   async getAllModuleProgress(moduleId: string): Promise<schema.StudentProgress[]> {
     // This method is fine
     try {
       const module = await this.db.query.readingModules.findFirst({ columns: { id: true }, where: eq(schema.readingModules.id, moduleId) });
       if (!module) throw new AppError('Reading module not found', 404);

       return await this.db.query.studentProgress.findMany({
         where: eq(schema.studentProgress.moduleId, moduleId),
         orderBy: [desc(schema.studentProgress.updatedAt)] // Optional: order by most recent
       });
     } catch (error) {
       if (error instanceof AppError) throw error;
       logger.error('Error getting all module progress:', { moduleId, error });
       throw new AppError('Failed to get module progress', 500);
     }
   }

   async getProgressById(progressId: string): Promise<schema.StudentProgress | null> {
    // This method is fine
     try {
       const progress = await this.db.query.studentProgress.findFirst({
         where: eq(schema.studentProgress.id, progressId)
       });
       return progress ?? null;
     } catch (error) {
       logger.error('Error getting progress by ID:', { progressId, error });
       throw new AppError('Failed to get progress by ID', 500);
     }
   }

   // This method needs clarification on teacher-student relationship
   async getTeacherStudentsProgress(teacherId: string): Promise<schema.StudentProgress[]> {
    try {
       const teacher = await this.db.query.profiles.findFirst({ where: eq(schema.profiles.id, teacherId) });
       if (!teacher) throw new AppError('Teacher not found', 404);

       // TODO: Implement actual logic based on how students are linked to teachers
       // This placeholder assumes a direct link which might not exist.
       logger.warn('getTeacherStudentsProgress needs implementation based on actual student-teacher relationship schema.');
       // Example using `inArray` if student IDs are known:
       // const studentIds = [...] // Get student IDs linked to teacherId
       // if (!studentIds || studentIds.length === 0) return [];
       // return await this.db.query.studentProgress.findMany({
       //    where: inArray(schema.studentProgress.studentId, studentIds),
       //    orderBy: [desc(schema.studentProgress.updatedAt)]
       // });
       return []; // Return empty until relationship is defined

     } catch (error) {
       if (error instanceof AppError) throw error;
       logger.error('Error getting teacher students progress:', { teacherId, error });
       throw new AppError('Failed to get teacher students progress', 500);
     }
   }
} 