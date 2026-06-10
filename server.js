import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ordersRoutes from "./routes/orders.js";
import paymentRoutes from "./routes/payment.js";
import { supabase } from "./supabase.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", ordersRoutes);
app.use("/api", paymentRoutes);

app.get("/", (req, res) => {
  res.json({ status: "backend online" });
});

async function deleteExpiredPendingOrders() {
  try {
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    const cutoff = new Date(Date.now() - FIFTEEN_MINUTES).toISOString();

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("status", "pending")
      .lt("created_at", cutoff);

    if (error) {
      console.error("DELETE EXPIRED ORDERS ERROR:", error.message);
    }
  } catch (err) {
    console.error("DELETE EXPIRED ORDERS ERROR:", err.message);
  }
}

deleteExpiredPendingOrders();
setInterval(deleteExpiredPendingOrders, 60 * 1000);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor a rodar na porta ${PORT}`);
});
