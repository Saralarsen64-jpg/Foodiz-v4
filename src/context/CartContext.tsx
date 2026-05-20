import { createContext, useContext, useEffect, useMemo, useState } from "react";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  points: number;
  image: string;
  category?: string;
};

type CartState = {
  establishmentId: string | null;
  establishmentName: string | null;
  items: CartItem[];
};

type AddCartItemInput = Omit<CartItem, "quantity">;

type CartContextValue = {
  establishmentId: string | null;
  establishmentName: string | null;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  totalPoints: number;
  addItem: (item: AddCartItemInput, establishment: { id: string; name: string }) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  replaceCart: (item: AddCartItemInput, establishment: { id: string; name: string }) => void;
};

const STORAGE_KEY = "foodiz_client_cart_v1";

const CartContext = createContext<CartContextValue | null>(null);

function loadInitialCart(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { establishmentId: null, establishmentName: null, items: [] };
    }
    const parsed = JSON.parse(raw) as CartState;
    return {
      establishmentId: parsed.establishmentId ?? null,
      establishmentName: parsed.establishmentName ?? null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return { establishmentId: null, establishmentName: null, items: [] };
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>(() => loadInitialCart());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const addItem = (item: AddCartItemInput, establishment: { id: string; name: string }) => {
    setCart((prev) => {
      const existing = prev.items.find((cartItem) => cartItem.id === item.id);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((cartItem) =>
            cartItem.id === item.id
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          ),
        };
      }

      return {
        establishmentId: establishment.id,
        establishmentName: establishment.name,
        items: [...prev.items, { ...item, quantity: 1 }],
      };
    });
  };

  const replaceCart = (item: AddCartItemInput, establishment: { id: string; name: string }) => {
    setCart({
      establishmentId: establishment.id,
      establishmentName: establishment.name,
      items: [{ ...item, quantity: 1 }],
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const items = prev.items
        .map((item) =>
          item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0);

      if (items.length === 0) {
        return { establishmentId: null, establishmentName: null, items: [] };
      }

      return { ...prev, items };
    });
  };

  const removeItem = (itemId: string) => {
    setCart((prev) => {
      const items = prev.items.filter((item) => item.id !== itemId);
      if (items.length === 0) {
        return { establishmentId: null, establishmentName: null, items: [] };
      }
      return { ...prev, items };
    });
  };

  const clearCart = () => {
    setCart({ establishmentId: null, establishmentName: null, items: [] });
  };

  const value = useMemo<CartContextValue>(() => {
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalPoints = cart.items.reduce((sum, item) => sum + item.points * item.quantity, 0);

    return {
      establishmentId: cart.establishmentId,
      establishmentName: cart.establishmentName,
      items: cart.items,
      itemCount,
      subtotal,
      totalPoints,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      replaceCart,
    };
  }, [cart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
