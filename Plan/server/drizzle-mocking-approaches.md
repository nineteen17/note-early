# Drizzle ORM Mocking Approaches

## Overview

This document outlines different approaches for mocking Drizzle ORM in tests, comparing their advantages and disadvantages. We'll explore both the built-in mock driver and manual mocking techniques.

## Approach 1: Using Drizzle's Built-in Mock Driver

Drizzle ORM provides a built-in mock driver through the `drizzle.mock()` method. This is documented at [https://orm.drizzle.team/docs/goodies#mock-driver](https://orm.drizzle.team/docs/goodies#mock-driver).

### Example:

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Create a mock db instance
const db = drizzle.mock({ schema });
```

### Advantages:

- **Official support**: Maintained by the Drizzle team
- **Simplicity**: Less boilerplate code needed
- **Type safety**: Preserves types from your schema
- **Consistency**: Follows the same API as the real Drizzle instance

### Disadvantages:

- **Limited control**: Less flexibility for customizing mock behavior
- **Newer feature**: May not be available in all drivers or have inconsistent implementation across them
- **Documentation**: Limited examples in official documentation

## Approach 2: Manual Chain Mocking

This approach involves manually mocking each method in the Drizzle query chain using testing utilities like Vitest's `vi.fn()` or Jest's `jest.fn()`.

### Example:

```typescript
import { vi } from "vitest";

// Define mock functions for the chain
const mockExecute = vi.fn();
const mockReturning = vi.fn(() => ({ execute: mockExecute }));
const mockWhere = vi.fn(() => ({
  execute: mockExecute,
  returning: mockReturning,
}));
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockFrom = vi.fn(() => ({ where: mockWhere, execute: mockExecute }));

// Mock Drizzle DB
vi.mock("@/db", () => {
  return {
    db: {
      select: vi.fn(() => ({ from: mockFrom })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => ({ execute: mockExecute })),
        })),
      })),
      update: vi.fn(() => ({ set: mockSet })),
      delete: vi.fn(() => ({ where: mockWhere })),
    },
  };
});
```

### Advantages:

- **Full control**: Complete flexibility over mock behavior
- **Fine-grained testing**: Can verify each step in the query chain
- **Independence**: Works with any Drizzle version or driver
- **Explicit behavior**: Makes test expectations very clear

### Disadvantages:

- **Verbose**: Requires significant boilerplate code
- **Maintenance**: Must be updated if Drizzle's API changes
- **Type challenges**: Can encounter TypeScript errors with complex queries
- **Learning curve**: Requires understanding of how Drizzle's chainable API works

## Example Test with Manual Chain Mocking

Here's an example of testing a method that uses Drizzle's `and()` function with manual chain mocking:

```typescript
describe("getUsersByFilters", () => {
  it("should fetch users with combined filter criteria using and()", async () => {
    const filters = {
      role: "STUDENT" as const,
      adminId: "admin-123",
    };

    const mockStudents = [
      createMockProfile({ id: "s1", role: "STUDENT", adminId: "admin-123" }),
      createMockProfile({ id: "s2", role: "STUDENT", adminId: "admin-123" }),
    ];

    // Configure mockExecute to return the mock students
    mockExecute.mockResolvedValue(mockStudents);

    const result = await userService.getUsersByFilters(filters);

    // Verify that db.select and from were called
    expect(db.select).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith(profiles);

    // Verify that the where method was called with and()
    expect(mockWhere).toHaveBeenCalledWith(
      and(eq(profiles.role, "STUDENT"), eq(profiles.adminId, "admin-123"))
    );

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockStudents);
  });
});
```

## Implementation Considerations

When choosing a mocking approach, consider:

1. **Project complexity**: For simpler projects, the built-in mock driver may be sufficient
2. **Test requirements**: If you need to verify exact query construction, manual mocking provides more control
3. **Team familiarity**: Choose an approach that your team can easily understand and maintain
4. **Driver support**: Check if your Drizzle driver supports the mock method (not all do)

## Best Practices

Regardless of the approach chosen:

1. **Reset mocks between tests**: Use `beforeEach(() => { vi.resetAllMocks(); })` to ensure test isolation
2. **Test error handling**: Ensure your tests cover error cases by mocking rejected promises
3. **Match implementation expectations**: Make sure your mocks return data in the format your service expects
4. **Keep it DRY**: Extract common mock setup to helper functions

## Conclusion

Both approaches have their merits:

- **Built-in mock driver** is simpler and more future-proof, but may be limited in some cases
- **Manual chain mocking** provides more control and verification capabilities, but requires more setup

For most projects, we recommend starting with the built-in mock driver if it meets your needs, and falling back to manual chain mocking when you need more control or your driver doesn't support `mock()`.
