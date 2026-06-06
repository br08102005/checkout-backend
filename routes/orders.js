import { supabase } from "../supabase.js";
import express from "express";

const router = express.Router();

router.post("/create-order", async (req, res) => {
  const { name, email, phone, plan, extras } = req.body;

  const plans = {
    3500: 3500,
    5000: 5000,
    7500: 7500,
    10000: 10000
  };

  const extrasPrice = {
    extra1: 1000,
    extra2: 1500,
    extra3: 2000
  };

  let total = plans[plan] || 0;

  if (extras && Array.isArray(extras)) {
    extras.forEach(e => {
      total += extrasPrice[e] || 0;
    });
  }

  total = plan;

  const orderId = "ORD-" + Date.now();
const { data, error } = await supabase
  .from("orders")
  .insert([
    {
      order_id: orderId,
      name,
      email,
      phone,
      plan,
      total,
      status: "pending"
    }
  ])
  .select();

if (error) {
  return res.status(500).json({
    success: false,
    error: error.message
  });
}

return res.json({
  success: true,
  order_id: orderId,
  total: total,
  saved: data
});
});

// GET ORDER BY ID
router.get("/order/:id", async (req, res) => {
  const { id } = req.params;

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_id", id)
    .single();

  if (error || !order) {
    return res.status(404).json({
      success: false,
      error: "Order not found"
    });
  }

  return res.json({
    success: true,
    order
  });
});

export default router;
