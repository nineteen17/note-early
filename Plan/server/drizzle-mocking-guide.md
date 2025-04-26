# Drizzle ORM Mocking Guide

## Overview

This guide outlines best practices for mocking Drizzle ORM in unit and integration tests. Since Drizzle uses chainable methods for query building, mocking requires special consideration to ensure tests are reliable and maintainable.

## Understanding Drizzle's Query Chain

Drizzle ORM uses method chaining to build queries, which makes it expressive but challenging to mock. A typical query might look like:

```typescript
// SELECT
const users = await db
  .select()
  .from(profiles)
  .where(eq(profiles.id, userId))
  .execute();

// INSERT
const newUser = await db
  .insert(profiles)
  .values(userData)
  .returning()
  .execute();

// UPDATE
const updatedUser = await db
  .update(profiles)
  .set(updates)
  .where(eq(profiles.id, userId))
  .returning()
  .execute();

// DELETE
const result = await db
  .delete(profiles)
  .where(eq(profiles.id, userId))
  .returning()
  .execute();
```

## Mocking Approaches

### Option 1: Function-by-function mocking (Recommended)

This approach creates individual mocks for each function in the chain, with each returning the next function in the chain.

```typescript
import { vi } from "vitest";
import { db } from "@/db";

// Mock the entire db object
vi.mock("@/db", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe("YourService", () => {
  let mockDb;
  const mockExecute = vi.fn();
  const mockFrom = vi.fn();
  const mockWhere = vi.fn();
  const mockValues = vi.fn();
  const mockReturning = vi.fn();
  const mockSet = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    // Set up the chainable mocks for select
    mockWhere.mockReturnValue({ execute: mockExecute });
    mockFrom.mockReturnValue({ where: mockWhere });
    (db.select as any).mockReturnValue({ from: mockFrom });

    // Set up the chainable mocks for insert
    mockReturning.mockReturnValue({ execute: mockExecute });
    mockValues.mockReturnValue({ returning: mockReturning });
    (db.insert as any).mockReturnValue({ values: mockValues });

    // Set up the chainable mocks for update
    mockReturning.mockReturnValue({ execute: mockExecute });
    mockWhere.mockReturnValue({ returning: mockReturning });
    mockSet.mockReturnValue({ where: mockWhere });
    (db.update as any).mockReturnValue({ set: mockSet });

    // Set up the chainable mocks for delete
    mockReturning.mockReturnValue({ execute: mockExecute });
    mockWhere.mockReturnValue({ returning: mockReturning });
    (db.delete as any).mockReturnValue({ where: mockWhere });
  });

  // Tests go here
});
```

### Option 2: Using mockReturnThis for method chaining

The `mockReturnThis()` method simplifies mocking chained methods by making each method return the same mock object:

```typescript
import { vi } from "vitest";

// Mock Drizzle DB
vi.mock("@/db", () => {
  const mockExecute = vi.fn();
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    execute: mockExecute,
  };

  return { db: mockDb };
});
```

## Example Implementation

Here's a complete example of mocking a Drizzle service:

```typescript
// Mock database first to avoid hoisting issues
import { vi } from "vitest";

// Mock Drizzle DB
vi.mock("@/db", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

// Now import everything else
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { UserService } from "../user.service";

describe("UserService", () => {
  let userService: UserService;
  const mockExecute = vi.fn();
  const mockFrom = vi.fn();
  const mockWhere = vi.fn();
  const mockValues = vi.fn();
  const mockReturning = vi.fn();
  const mockSet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    userService = new UserService();

    // Set up the chainable mocks for select
    mockWhere.mockReturnValue({ execute: mockExecute });
    mockFrom.mockReturnValue({ where: mockWhere });
    (db.select as any).mockReturnValue({ from: mockFrom });

    // Set up the chainable mocks for insert
    mockReturning.mockReturnValue({ execute: mockExecute });
    mockValues.mockReturnValue({ returning: mockReturning });
    (db.insert as any).mockReturnValue({ values: mockValues });

    // Set up the chainable mocks for update
    mockReturning.mockReturnValue({ execute: mockExecute });
    mockWhere.mockReturnValue({ returning: mockReturning });
    mockSet.mockReturnValue({ where: mockWhere });
    (db.update as any).mockReturnValue({ set: mockSet });

    // Set up the chainable mocks for delete
    mockReturning.mockReturnValue({ execute: mockExecute });
    mockWhere.mockReturnValue({ returning: mockReturning });
    (db.delete as any).mockReturnValue({ where: mockWhere });
  });

  describe("getUserById", () => {
    it("should return a user by ID", async () => {
      const userId = "1";
      const mockUser = { id: userId, name: "Test User" };

      // Mock the execute function to return our test data
      mockExecute.mockResolvedValue([mockUser]);

      const result = await userService.getUserById(userId);

      expect(db.select).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith(profiles);
      expect(mockWhere).toHaveBeenCalledWith(eq(profiles.id, userId));
      expect(result).toEqual(mockUser);
    });

    it("should handle not found case", async () => {
      mockExecute.mockResolvedValue([]);

      await expect(userService.getUserById("unknown-id")).rejects.toThrow(
        "User not found"
      );
    });
  });
});
```

## Common Pitfalls

### 1. Mock Return Order

When using `mockExecute`, be careful about the order of mock implementations. For tests that make multiple database calls, use `mockImplementationOnce()` to set up different responses for each call:

```typescript
// For sequential calls to execute
mockExecute.mockImplementationOnce(() => Promise.resolve([{ id: userId }])); // First call
mockExecute.mockImplementationOnce(() => Promise.resolve(updatedUser)); // Second call
```

### 2. Inconsistent Mocking

Ensure all chained methods are properly mocked. Missing one step in the chain will cause TypeScript errors or runtime failures.

### 3. Forgetting to Reset Mocks

Always reset your mocks in `beforeEach` to ensure clean tests:

```typescript
beforeEach(() => {
  vi.resetAllMocks(); // or vi.clearAllMocks()
});
```

## Best Practices

1. **Standardize Your Approach**: Choose one mocking strategy and use it consistently.

2. **Mock at the Boundary**: Mock the database at the service boundary, not within services.

3. **Test Error Handling**: Mock error cases to ensure your service properly handles database failures.

4. **Validate All Query Parts**: Assert not just results but that queries are constructed correctly.

5. **Use Type Inference**: Utilize Drizzle's type inference for more accurate mocks.

## Example with Custom Query Filters

For more complex queries, you may need to adjust your mocking:

```typescript
// Testing a query with multiple where clauses
it("should filter by multiple criteria", async () => {
  const filters = { status: "active", adminId: "123" };

  mockExecute.mockResolvedValue([mockUser1, mockUser2]);

  const result = await userService.getUsersByFilters(filters);

  expect(mockWhere).toHaveBeenCalledWith(
    and(eq(profiles.status, "active"), eq(profiles.adminId, "123"))
  );
  expect(result).toHaveLength(2);
});
```

## Conclusion

Properly mocking Drizzle ORM requires understanding its chainable API pattern. By implementing consistent, thorough mocks, you can create reliable tests that verify your database interactions without requiring actual database connections.

Remember that tests should focus on your service's behavior, not on the details of the ORM. The mocking patterns here help isolate your service logic from the database implementation.
