"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { addToCart, fetchCart, removeCartItem, updateCartItem } from "@/lib/api";
import { CartResponse } from "@/lib/types";

interface CartContextType {
  cart: CartResponse | null;
  itemCount: number;
  loading: boolean;
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  refreshCart: () => Promise<void>;
  addItem: (productId: number, quantity?: number) => Promise<void>;
  updateItem: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
}

const CartContext = createContext<CartContextType>({
  cart: null,
  itemCount: 0,
  loading: false,
  isDrawerOpen: false,
  setDrawerOpen: () => {},
  refreshCart: async () => {},
  addItem: async () => {},
  updateItem: async () => {},
  removeItem: async () => {},
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
    try {
      setLoading(true);
      const data = await fetchCart(user.id);
      setCart(data);
    } catch (err) {
      console.warn("Failed to load cart:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = async (productId: number, quantity: number = 1) => {
    if (!user) return;
    const res = await addToCart(productId, quantity, user.id);
    if (res.cart) {
      setCart(res.cart);
    } else {
      await refreshCart();
    }
    setDrawerOpen(true);
  };

  const updateItem = async (productId: number, quantity: number) => {
    if (!user) return;
    const res = await updateCartItem(productId, quantity, user.id);
    if (res.cart) {
      setCart(res.cart);
    } else {
      await refreshCart();
    }
  };

  const removeItem = async (productId: number) => {
    if (!user) return;
    const res = await removeCartItem(productId, user.id);
    if (res.cart) {
      setCart(res.cart);
    } else {
      await refreshCart();
    }
  };

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        loading,
        isDrawerOpen,
        setDrawerOpen,
        refreshCart,
        addItem,
        updateItem,
        removeItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
