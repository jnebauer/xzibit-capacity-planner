// Configuration for Capacity Planner
export const config = {
  // JWT Secret - must match the one used in truck-load-planner
  JWT_SECRET: process.env.JWT_SECRET,

  // Truck Load Planner URL - the main authentication server
  XZIBIT_APPS_URL: process.env.XZIBIT_APPS_URL,

  // MongoDB connection string
  MONGODB_URI: process.env.MONGODB_URI,
};