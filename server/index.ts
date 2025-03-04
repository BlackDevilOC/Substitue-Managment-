import express, { type Request, Response, NextFunction } from "express";
import { createServer as createRoutes } from "./routes"; // Assuming createServer is renamed for clarity

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


(async () => {
  const server = await createRoutes(app); // Use the new routes function

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error(err); // Log the error for debugging
  });


  const port = process.env.PORT || 5000; // Use environment variable or default to 5000
  server.listen(port, "0.0.0.0", async () => {
    console.log(`[express] serving on port ${port}`);
    const { loadInitialData } = await import('./csv-handler');
    console.log("[loadInitialData] Loading data from CSV files...");
    await loadInitialData();
    console.log("[loadInitialData] Data loading complete.");
  });
})();