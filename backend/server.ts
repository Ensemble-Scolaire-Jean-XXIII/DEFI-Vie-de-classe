import express from "express";
import { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { UPLOADS_DIR } from "./middleware/upload";
import userRoutes from "./routes/userRoutes";
import classRoutes from "./routes/classRoutes";
import itemRoutes from "./routes/itemRoutes";
import levelRoutes from "./routes/levelRoutes";
import globalMedalRoutes from "./routes/globalMedalRoutes";
import pointRoutes from "./routes/pointRoutes";
import trimestreRoutes from "./routes/trimestreRoutes";
import { startTrimestreScheduler } from "./jobs/trimestreScheduler";
import { AppError } from "./utils/appError";

const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(UPLOADS_DIR)));

app.use("/api/users", userRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/levels", levelRoutes);
app.use("/api/global-medals", globalMedalRoutes);
app.use("/api/points", pointRoutes);
app.use("/api/trimestres", trimestreRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startTrimestreScheduler();
});
