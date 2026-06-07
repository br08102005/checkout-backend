import { supabase } from "../supabase.js";
import express from "express";

const router = express.Router();

router.post("/create-order", async (req, res) => {
  console.log("DADOS RECEBIDOS:", req.body);

  const { name, email, phone, plan, extras } = req.body;

  // preços base dos planos
  const plans = {
    3500: 3500,
    5000: 5000,
    7500: 7500,
    10000: 10000
  };

  // preços extras
  const extrasPrice = {
    extra1: 1000,
    extra2: 1500,
    extra3: 2250
  };

  // 1. calcular total corretamente
  let total = plans[plan] || 0;

  console.log("PLAN SELECIONADO:", plan);
  console.log("EXTRAS RECEBIDOS:", extras);

  if (Array.isArray(extras)) {
    extras.forEach(e => {
      total += extrasPrice[e] || 0;
    });
  }

  // 2. debug final do total
  console.log("TOTAL CALCULADO:", total);

  // 3. criar ID do pedido
  const orderId = "ORD-" + Date.now();

  // 4. guardar no Supabase
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
    total,
    order: data
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
