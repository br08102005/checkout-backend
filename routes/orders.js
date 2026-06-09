import { supabase } from "../supabase.js";
import express from "express";

const router = express.Router();

/* MAPA DE LINKS */
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

router.post("/create-order", async (req, res) => {
  try {
    console.log("DADOS RECEBIDOS:", req.body);

    const { name, email, phone, plan, extras } = req.body || {};

    const plans = {
      3500: 3500,
      5000: 5000,
      7500: 7500,
      10000: 10000
    };

    const extrasPrice = {
      extra1: 1000,
      extra2: 1500,
      extra3: 2250
    };

    /* 1. calcular total */
    let total = plans[String(plan)] || 0;

    if (Array.isArray(extras)) {
      extras.forEach(e => {
        total += extrasPrice[e] || 0;
      });
    }

    console.log("TOTAL CALCULADO:", total);

    /* 2. gerar links */
    const links = [];

    // produto principal
    if (productLinks[String(plan)]) {
      links.push(productLinks[String(plan)]);
    }

    // extras
    if (Array.isArray(extras)) {
      extras.forEach(e => {
        if (extrasLinks[e]) {
          links.push(extrasLinks[e]);
        }
      });
    }

    console.log("LINKS GERADOS:", links);

    /* 3. criar ID */
    const orderId = "ORD-" + Date.now();

    /* 4. guardar no Supabase */
    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          order_id: orderId,
          name,
          email,
          phone,
          plan,
          extras,
          total,
          status: "pending",
          download_links: links.join("|")
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

  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

/* GET ORDER */
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
