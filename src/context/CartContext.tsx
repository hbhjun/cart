import React, { createContext, useContext, useState } from "react";
import { Product } from "../data/products";

export interface CartItem extends Product {
    quantity: number;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product) => void;
    increase: (id: number) => void;
    decrease: (id: number) => void;
    remove: (id: number) => void;
    clear: () => void;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>([]);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                if (existing.quantity + 1 > product.stock) {
                    alert("库存不足");
                    return prev;
                }
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const increase = (id: number) => {
        setCart(prev =>
            prev.map(item =>
                item.id === id
                    ? item.quantity + 1 > item.stock
                        ? (alert("库存不足"), item)
                        : { ...item, quantity: item.quantity + 1 }
                    : item
            )
        );
    };

    const decrease = (id: number) => {
        setCart(prev =>
            prev
                .map(item =>
                    item.id === id ? { ...item, quantity: item.quantity - 1 } : item
                )
                .filter(item => item.quantity > 0)
        );
    };

    const remove = (id: number) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const clear = () => {
        setCart([]);
    };

    return (
        <CartContext.Provider value={{ cart, addToCart, increase, decrease, remove, clear }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error("useCart 必须在 CartProvider 内使用");
    return context;
};
