import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'delivered';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  deliveryCode: string;
  address: string;
  createdAt: string;
  courierId?: string;
}

interface OrderContextType {
  orders: Order[];
  createOrder: (restaurantId: string, restaurantName: string, items: OrderItem[], total: number, address: string, clientName: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, courierId?: string) => void;
  getClientOrders: (clientId: string) => Order[];
  getRestaurantOrders: (restaurantId: string) => Order[];
  getAvailableDeliveries: () => Order[]; // Orders that are 'ready' or 'accepted'
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('foodiz_orders');
    if (saved) setOrders(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('foodiz_orders', JSON.stringify(orders));
  }, [orders]);

  const createOrder = (restaurantId: string, restaurantName: string, items: OrderItem[], total: number, address: string, clientName: string) => {
    const newOrder: Order = {
      id: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      clientId: 'client_1', // Mock client
      clientName,
      restaurantId,
      restaurantName,
      items,
      total,
      status: 'pending',
      deliveryCode: Math.floor(100000 + Math.random() * 900000).toString(),
      address,
      createdAt: new Date().toISOString(),
    };
    setOrders([newOrder, ...orders]);
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, courierId?: string) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status, courierId: courierId || o.courierId } : o));
  };

  const getClientOrders = (clientId: string) => orders.filter(o => o.clientId === clientId);
  const getRestaurantOrders = (restaurantId: string) => orders.filter(o => o.restaurantId === restaurantId);
  const getAvailableDeliveries = () => orders.filter(o => o.status === 'ready' || (o.status === 'accepted' && !o.courierId));

  return (
    <OrderContext.Provider value={{ orders, createOrder, updateOrderStatus, getClientOrders, getRestaurantOrders, getAvailableDeliveries }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrders must be used within OrderProvider');
  return context;
};
