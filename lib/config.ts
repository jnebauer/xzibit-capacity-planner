// Configuration for Capacity Planner
export const config = {
  // JWT Secret - must match the one used in truck-load-planner
  JWT_SECRET: process.env.JWT_SECRET,

  // Truck Load Planner URL - the main authentication server
  TRUCK_LOAD_PLANNER_URL: process.env.TRUCK_LOAD_PLANNER_URL,

  // MongoDB connection string
  MONGODB_URI: process.env.MONGODB_URI,
};