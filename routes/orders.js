import { supabase } from "../supabase.js";
import express from "express";

const router = express.Router();

const productLinks = {
  3500: "LINK_PRODUTO_3500",
  5000: "LINK_PRODUTO_5000"
};

const extrasPrice = {
  extra1: 2250,
  extra2: 1500,
  extra3: 1000
};

router.post("/create-order", async (req, res) => {
  try {

    const { name, email, phone, plan, extras = [] } = req.body || {};
    const safeExtras = Array.isArray(extras) ? extras : [];

    /* 🔥 evitar duplicados */
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

    /* 💰 calcular total */
    let total = Number(plan) || 0;

    safeExtras.forEach(e => {
      total += extrasPrice[e] || 0;
    });

    /* 🔗 links */
    const links = [];

    if (productLinks[plan]) {
      links.push(productLinks[plan]);
    }

    safeExtras.forEach(e => {
      if (extrasPrice[e]) {
        links.push(`LINK_${e.toUpperCase()}`);
      }
    });

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
        download_links: links.join("|")
      }])
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      order_id: orderId,
      total
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "server_error"
    });
  }
});

/* GET ORDER */
router.get("/order/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_id", id)
    .single();

  if (error || !data) {
    return res.status(404).json({
      success: false,
      error: "not_found"
    });
  }

  return res.json({
    success: true,
    order: data
  });
});

export default router;
