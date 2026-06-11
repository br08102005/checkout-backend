import { supabase } from "../supabase.js";
import express from "express";

const router = express.Router();

/* =========================
   MAPA DE LINKS
   ========================= */
const productLinks = {
  3500: "LINK_PRODUTO_3500",
  5000: "LINK_PRODUTO_5000",
  7500: "LINK_PRODUTO_7500",
  10000: "LINK_PRODUTO_10000"
};

const extrasLinks = {
  extra1: "LINK_EXTRA_1",
  extra2: "LINK_EXTRA_2",
  extra3: "LINK_EXTRA_3"
};

/* =========================
   FUNÇÃO SEGURA DE DINHEIRO
   ========================= */
function safeMoney(value) {
  return Math.round(Number(value || 0));
}

/* =========================
   CREATE ORDER
   ========================= */
router.post("/create-order", async (req, res) => {
  try {
    console.log("DADOS RECEBIDOS:", req.body);

    const { name, email, phone, plan, extras = [] } = req.body || {};
    const safeExtras = Array.isArray(extras) ? extras : [];

    const { data: existing } = await supabase
      .from("orders")
      .select("order_id,total")
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return res.json({
        success: true,
        order_id: existing.order_id,
        total: existing.total
      });
    }

    const plans = {
      3500: 3500,
      5000: 5000,
      7500: 7500,
      10000: 10000
    };

    const extrasPrice = {
      extra1: 2250,
      extra2: 1500,
      extra3: 1000
    };

    let total = plans[Number(plan)] || 0;

    safeExtras.forEach(e => {
      total += extrasPrice[e] || 0;
    });

    /* 🔥 GARANTIA ABSOLUTA DE INTEIRO */
    total = safeMoney(total);

    console.log("TOTAL CALCULADO:", total);

    const links = [];

    if (productLinks[Number(plan)]) {
      links.push(productLinks[Number(plan)]);
    }

    safeExtras.forEach(e => {
      if (extrasLinks[e]) {
        links.push(extrasLinks[e]);
      }
    });

    console.log("LINKS GERADOS:", links);

    const orderId = "ORD-" + Date.now();

    const { data, error } = await supabase
      .from("orders")
      .insert([{
        order_id: orderId,
        name,
        email,
        phone,
        plan,
        extras: safeExtras,
        total,
        status: "pending",
        activity_score: 0,
        last_active_at: new Date().toISOString(),
        download_links: links.join("|")
      }])
      .select()
      .single();

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

  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

/* =========================
   ACTIVITY TRACKING
   ========================= */
router.post("/order/:id/activity", async (req, res) => {
  try {
    const { id } = req.params;
    const { event } = req.body || {};

    const weights = {
      payment_page_open: 10,
      payment_page_visible: 5,
      copy_entity: 20,
      copy_reference: 25,
      copy_amount: 50
    };

    const points = weights[event] || 0;

    if (!points) {
      return res.status(400).json({
        success: false,
        error: "Invalid activity event"
      });
    }

    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("order_id,status,activity_score")
      .eq("order_id", id)
      .eq("status", "pending")
      .maybeSingle();

    if (findError) {
      return res.status(500).json({
        success: false,
        error: findError.message
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Pending order not found"
      });
    }

    const newScore = Number(order.activity_score || 0) + points;

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        activity_score: newScore,
        last_active_at: new Date().toISOString()
      })
      .eq("order_id", id)
      .eq("status", "pending");

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: updateError.message
      });
    }

    return res.json({
      success: true,
      activity_score: newScore
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* =========================
   GET ORDER
   ========================= */
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
