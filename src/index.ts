import { Hono } from "hono";
import { serve } from "@hono/node-server";

// Create app
const app = new Hono();

// Welcome route
app.get("/", (c) => {
  return c.json({
    message: "🎉 Congratulations! Your API is working!",
    timestamp: new Date().toISOString(),
    instructions: "Try visiting /hello/YourName",
  });
});

// Dynamic greeting route
app.get("/hello/:name", (c) => {
  const name = c.req.param("name");
  return c.json({
    message: `Hello, ${name}! Welcome to backend development!`,
    tip: "You just used a route parameter!",
  });
});

// User data (in memory for now)
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  city: string;
  isActive: boolean; // Fixed: use camelCase
}

let users: User[] = [
  {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
    age: 25,
    city: "delhi",
    isActive: true, // Fixed: camelCase
  },
  {
    id: 2,
    name: "Bob",
    email: "bob@example.com",
    age: 34,
    city: "pune",
    isActive: true, // Fixed: camelCase
  },
  {
    id: 3,
    name: "Charlie",
    email: "charlie@example.com",
    age: 28,
    city: "delhi",
    isActive: true,
  },
];

// Get all users
app.get("/users", (c) => {
  return c.json({
    count: users.length,
    users: users,
  });
});

// ⭐ IMPORTANT: Specific routes BEFORE generic routes
// Search users by city (MOVED UP - BEFORE /users/:id)
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

// Get active users (also specific route)
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

// Get single user (generic route - comes AFTER specific routes)
app.get("/users/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  const user = users.find((u) => u.id === id);

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(user);
});

// Create new user
app.post("/users", async (c) => {
  const body = await c.req.json();

  const newUser: User = {
    id: users.length + 1,
    name: body.name,
    email: body.email,
    age: body.age,
    city: body.city,
    isActive: body.isActive, // Fixed: camelCase
  };

  users.push(newUser);

  return c.json(
    {
      message: "User created successfully!",
      user: newUser,
    },
    201
  );
});

// Update user
app.put("/users/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    return c.json({ error: "User not found" }, 404);
  }

  users[index] = { ...users[index], ...body };

  return c.json({
    message: "User updated successfully!",
    user: users[index],
  });
});

// Delete user
app.delete("/users/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    return c.json({ error: "User not found" }, 404);
  }

  const deletedUser = users[index];
  users.splice(index, 1);

  return c.json({
    message: "User deleted successfully!",
    user: deletedUser,
  });
});

// Start server
const port = 3001;
console.log(`
╔══════════════════════════════════════╗
║  🚀 Server is running!              ║
║  📍 http://localhost:${port}           ║
║                                      ║
║  Available endpoints:                ║
║  • GET  /                            ║
║  • GET  /hello/:name                 ║
║  • GET  /users                       ║
║  • GET  /users/city/:cityName        ║
║  • GET  /users/status/active         ║
║  • GET  /users/status/inactive       ║
║  • GET  /users/:id                   ║
║  • POST /users                       ║
║  • PUT  /users/:id                   ║
║  • DELETE /users/:id                 ║
╚══════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
});
