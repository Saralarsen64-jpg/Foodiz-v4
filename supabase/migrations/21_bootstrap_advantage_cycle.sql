-- Publish the first authoritative free-engine cycle immediately.

SELECT public.publish_foodiz_advantage_cycle(
  '[
    {
      "template_key": "250-drink",
      "title": "Boisson offerte",
      "description": "Une boisson offerte dans la limite de 2,50 €.",
      "points_cost": 250,
      "face_value_cents": 250,
      "minimum_order_cents": 0,
      "category": "restaurant",
      "reward_type": "free_item",
      "eligible_products": [],
      "eligible_establishments": []
    },
    {
      "template_key": "500-delivery",
      "title": "Livraison offerte",
      "description": "Vos frais de livraison sont offerts dans la limite de 5 €.",
      "points_cost": 500,
      "face_value_cents": 500,
      "minimum_order_cents": 0,
      "category": "all",
      "reward_type": "free_delivery",
      "eligible_products": [],
      "eligible_establishments": []
    },
    {
      "template_key": "800-restaurant",
      "title": "8 € sur votre commande restaurant",
      "description": "Une réduction sur votre commande restaurant dès 30 € d''achat.",
      "points_cost": 800,
      "face_value_cents": 800,
      "minimum_order_cents": 3000,
      "category": "restaurant",
      "reward_type": "fixed_discount",
      "eligible_products": [],
      "eligible_establishments": []
    },
    {
      "template_key": "1000-market-item",
      "title": "Produit Market offert",
      "description": "Un produit Market offert dans la limite de 10 €.",
      "points_cost": 1000,
      "face_value_cents": 1000,
      "minimum_order_cents": 0,
      "category": "market",
      "reward_type": "free_item",
      "eligible_products": [],
      "eligible_establishments": []
    },
    {
      "template_key": "1500-groceries",
      "title": "15 € sur vos courses",
      "description": "Une réduction sur vos courses dès 50 € d''achat.",
      "points_cost": 1500,
      "face_value_cents": 1500,
      "minimum_order_cents": 5000,
      "category": "market",
      "reward_type": "fixed_discount",
      "eligible_products": [],
      "eligible_establishments": []
    },
    {
      "template_key": "2000-premium",
      "title": "Menu premium offert",
      "description": "Un menu premium offert dans la limite de 20 €.",
      "points_cost": 2000,
      "face_value_cents": 2000,
      "minimum_order_cents": 0,
      "category": "restaurant",
      "reward_type": "free_item",
      "eligible_products": [],
      "eligible_establishments": []
    }
  ]'::jsonb
);
