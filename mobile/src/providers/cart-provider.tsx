import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';

export type MobileCartItem = {
  productId: string;
  name: string;
  clientPriceCents: number;
  quantity: number;
};

type CartContextValue = {
  restaurantId: string | null;
  restaurantName: string | null;
  items: MobileCartItem[];
  itemCount: number;
  subtotalCents: number;
  addItem: (
    item: Omit<MobileCartItem, 'quantity'>,
    restaurant: { id: string; name: string },
  ) => boolean;
  updateQuantity: (productId: string, delta: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const CART_STORAGE_KEY = 'foodiz_mobile_cart_v1';

export function CartProvider({ children }: PropsWithChildren) {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [items, setItems] = useState<MobileCartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(CART_STORAGE_KEY)
      .then((stored) => {
        if (!active || !stored) return;
        const parsed = JSON.parse(stored) as {
          restaurantId?: string | null;
          restaurantName?: string | null;
          items?: MobileCartItem[];
        };
        setRestaurantId(parsed.restaurantId || null);
        setRestaurantName(parsed.restaurantName || null);
        setItems(Array.isArray(parsed.items) ? parsed.items : []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void SecureStore.setItemAsync(
      CART_STORAGE_KEY,
      JSON.stringify({ restaurantId, restaurantName, items }),
    );
  }, [hydrated, items, restaurantId, restaurantName]);

  const value = useMemo<CartContextValue>(
    () => ({
      restaurantId,
      restaurantName,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalCents: items.reduce(
        (sum, item) => sum + item.clientPriceCents * item.quantity,
        0,
      ),
      addItem: (item, restaurant) => {
        if (restaurantId && restaurantId !== restaurant.id) return false;
        setRestaurantId(restaurant.id);
        setRestaurantName(restaurant.name);
        setItems((current) => {
          const existing = current.find(
            (candidate) => candidate.productId === item.productId,
          );
          if (existing) {
            return current.map((candidate) =>
              candidate.productId === item.productId
                ? { ...candidate, quantity: candidate.quantity + 1 }
                : candidate,
            );
          }
          return [...current, { ...item, quantity: 1 }];
        });
        return true;
      },
      updateQuantity: (productId, delta) => {
        setItems((current) => {
          const next = current
            .map((item) =>
              item.productId === productId
                ? { ...item, quantity: Math.max(0, item.quantity + delta) }
                : item,
            )
            .filter((item) => item.quantity > 0);
          if (next.length === 0) {
            setRestaurantId(null);
            setRestaurantName(null);
          }
          return next;
        });
      },
      clear: () => {
        setRestaurantId(null);
        setRestaurantName(null);
        setItems([]);
      },
    }),
    [items, restaurantId, restaurantName],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
