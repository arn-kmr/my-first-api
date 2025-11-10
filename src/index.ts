import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { z } from "zod";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create app
const app = new Hono();

// Configuration from environment variables
const PORT = parseInt(process.env.PORT || "3001");
const API_VERSION = process.env.API_VERSION || "1.0.0";
const API_NAME = process.env.API_NAME || "Backend API";

// ========================================
// VALIDATION SCHEMAS
// ========================================

// User validation schema
const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name too long"),
  email: z.string().email("Invalid email format"),
  age: z.number().int().positive("Age must be positive").min(1).max(150),
  city: z.string().min(2, "City must be at least 2 characters"),
  isActive: z.boolean().optional().default(true),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  age: z.number().int().positive().min(1).max(150).optional(),
  city: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});

// ID parameter validation
const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a number"),
});

// ========================================
// DATA TYPES & STORAGE
// ========================================

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  city: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

let users: User[] = [
  {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
    age: 25,
    city: "Delhi",
    isActive: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  {
    id: 2,
    name: "Bob",
    email: "bob@example.com",
    age: 34,
    city: "Pune",
    isActive: true,
    createdAt: new Date("2025-01-02"),
    updatedAt: new Date("2025-01-02"),
  },
  {
    id: 3,
    name: "Charlie",
    email: "charlie@example.com",
    age: 28,
    city: "Delhi",
    isActive: true,
    createdAt: new Date("2025-01-03"),
    updatedAt: new Date("2025-01-03"),
  },
];

// ========================================
// MIDDLEWARE
// ========================================

// Request logger middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.url} - ${ms}ms`);
});

// ========================================
// ROUTES
// ========================================

// Welcome route
app.get("/", (c) => {
  return c.json({
    message: `🎉 Welcome to ${API_NAME}!`,
    version: API_VERSION,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      users: "/users",
      health: "/health",
    },
  });
});

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    data: {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.isActive).length,
    },
  });
});

// Get all users (with optional filtering)
app.get("/users", (c) => {
  const activeOnly = c.req.query("active");

  let filteredUsers = users;

  if (activeOnly === "true") {
    filteredUsers = users.filter((u) => u.isActive);
  } else if (activeOnly === "false") {
    filteredUsers = users.filter((u) => !u.isActive);
  }

  return c.json({
    count: filteredUsers.length,
    users: filteredUsers,
  });
});

// Search users by city
app.get("/users/city/:cityName", (c) => {
  const cityName = c.req.param("cityName");
  const cityUsers = users.filter(
    (u) => u.city.toLowerCase() === cityName.toLowerCase()
  );

  return c.json({
    city: cityName,
    count: cityUsers.length,
    users: cityUsers,
  });
});

// Get active users
app.get("/users/status/active", (c) => {
  const activeUsers = users.filter((u) => u.isActive === true);
  return c.json({
    status: "active",
    count: activeUsers.length,
    users: activeUsers,
  });
});

// Get inactive users
app.get("/users/status/inactive", (c) => {
  const inactiveUsers = users.filter((u) => u.isActive === false);
  return c.json({
    status: "inactive",
    count: inactiveUsers.length,
    users: inactiveUsers,
  });
});

// Get single user
app.get("/users/:id", (c) => {
  // Validate ID parameter
  const paramValidation = idParamSchema.safeParse({
    id: c.req.param("id"),
  });

  if (!paramValidation.success) {
    return c.json(
      {
        error: "Validation failed",
        message: "ID parameter must be a valid number",
      },
      400
    );
  }

  const id = parseInt(c.req.param("id"));
  const user = users.find((u) => u.id === id);

  if (!user) {
    return c.json(
      {
        error: "User not found",
        message: `No user found with ID: ${id}`,
      },
      404
    );
  }

  return c.json(user);
});

// Create new user (WITH VALIDATION)
app.post("/users", async (c) => {
  try {
    // Parse request body
    const body = await c.req.json();

    // Validate with Zod
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          error: "Validation failed",
          details: validation.error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        400
      );
    }

    const validatedData = validation.data;

    // Check if email already exists
    const emailExists = users.some((u) => u.email === validatedData.email);
    if (emailExists) {
      return c.json(
        {
          error: "Email already exists",
          message: `User with email ${validatedData.email} already exists`,
        },
        409
      );
    }

    // Create new user
    const newUser: User = {
      id: users.length + 1,
      name: validatedData.name,
      email: validatedData.email,
      age: validatedData.age,
      city: validatedData.city,
      isActive: validatedData.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    users.push(newUser);

    return c.json(
      {
        message: "User created successfully!",
        user: newUser,
      },
      201
    );
  } catch (error) {
    return c.json(
      {
        error: "Invalid JSON",
        message: "Request body must be valid JSON",
      },
      400
    );
  }
});

// Update user (WITH VALIDATION)
app.put("/users/:id", async (c) => {
  try {
    // Validate ID
    const paramValidation = idParamSchema.safeParse({
      id: c.req.param("id"),
    });

    if (!paramValidation.success) {
      return c.json(
        {
          error: "Invalid ID",
          message: "ID parameter must be a valid number",
        },
        400
      );
    }

    const id = parseInt(c.req.param("id"));
    const index = users.findIndex((u) => u.id === id);

    if (index === -1) {
      return c.json(
        {
          error: "User not found",
          message: `No user found with ID: ${id}`,
        },
        404
      );
    }

    // Parse and validate body
    const body = await c.req.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          error: "Validation failed",
          details: (validation.error as z.ZodError).issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        400
      );
    }

    const validatedData = validation.data;

    // Check if new email already exists (if email is being updated)
    if (validatedData.email && validatedData.email !== users[index].email) {
      const emailExists = users.some((u) => u.email === validatedData.email);
      if (emailExists) {
        return c.json(
          {
            error: "Email already exists",
            message: `User with email ${validatedData.email} already exists`,
          },
          409
        );
      }
    }

    // Update user
    users[index] = {
      ...users[index],
      ...validatedData,
      updatedAt: new Date(),
    };

    return c.json({
      message: "User updated successfully!",
      user: users[index],
    });
  } catch (error) {
    return c.json(
      {
        error: "Invalid JSON",
        message: "Request body must be valid JSON",
      },
      400
    );
  }
});

// Delete user
app.delete("/users/:id", (c) => {
  // Validate ID
  const paramValidation = idParamSchema.safeParse({
    id: c.req.param("id"),
  });

  if (!paramValidation.success) {
    return c.json(
      {
        error: "Invalid ID",
        message: "ID parameter must be a valid number",
      },
      400
    );
  }

  const id = parseInt(c.req.param("id"));
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    return c.json(
      {
        error: "User not found",
        message: `No user found with ID: ${id}`,
      },
      404
    );
  }

  const deletedUser = users[index];
  users.splice(index, 1);

  return c.json({
    message: "User deleted successfully!",
    user: deletedUser,
  });
});

// 404 handler for unknown routes
app.notFound((c) => {
  return c.json(
    {
      error: "Not Found",
      message: `Route ${c.req.url} not found`,
      availableEndpoints: [
        "/",
        "/health",
        "/users",
        "/users/:id",
        "/users/city/:cityName",
        "/users/status/active",
        "/users/status/inactive",
      ],
    },
    404
  );
});

// Global error handler
app.onError((err, c) => {
  console.error("Error:", err);
  return c.json(
    {
      error: "Internal Server Error",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Something went wrong",
    },
    500
  );
});

// ========================================
// START SERVER
// ========================================

console.log(`
╔══════════════════════════════════════╗
║  🚀 ${API_NAME}                      
║  📍 http://localhost:${PORT}           
║  🔧 Environment: ${process.env.NODE_ENV}     
║  📦 Version: ${API_VERSION}                  
║                                      ║
║  Available endpoints:                ║
║  • GET    /                          ║
║  • GET    /health                    ║
║  • GET    /users                     ║
║  • GET    /users/city/:cityName      ║
║  • GET    /users/status/active       ║
║  • GET    /users/status/inactive     ║
║  • GET    /users/:id                 ║
║  • POST   /users                     ║
║  • PUT    /users/:id                 ║
║  • DELETE /users/:id                 ║
╚══════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port: PORT,
});
