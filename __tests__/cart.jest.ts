import { renderHook, act } from "@testing-library/react";
import { CartProvider, useCart } from "../src/context/CartContext";
import React, { ReactNode } from "react";
import { Product } from "../src/data/products";

// ✅ wrapper 是一个函数组件，不是类型
const wrapper = ({ children }: { children: ReactNode }) => (
    <CartProvider>{children}</CartProvider>
);

const mockProduct: Product = {
    id: 1,
    name: "iPhone 15",
    price: 799,
    stock: 2,
    description: "最新款苹果手机",
};

describe("🛒 CartContext", () => {
    test("添加商品到购物车", () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(mockProduct);
        });

        expect(result.current.cart.length).toBe(1);
        expect(result.current.cart[0].quantity).toBe(1);
    });

    test("同一商品多次添加数量增加", () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(mockProduct);
            result.current.addToCart(mockProduct);
        });

        expect(result.current.cart[0].quantity).toBe(2);
    });

    test("超过库存时不再增加", () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(mockProduct);
            result.current.addToCart(mockProduct);
            result.current.addToCart(mockProduct); // 超出库存
        });

        expect(result.current.cart[0].quantity).toBeLessThanOrEqual(mockProduct.stock);
    });

    test("减少商品数量", () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(mockProduct);
            result.current.addToCart(mockProduct);
            result.current.decrease(mockProduct.id);
        });

        expect(result.current.cart[0].quantity).toBe(1);
    });

    test("数量减到0时商品应被移除", () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(mockProduct);
            result.current.decrease(mockProduct.id);
        });

        expect(result.current.cart.length).toBe(0);
    });

    test("删除单个商品", () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(mockProduct);
            result.current.remove(mockProduct.id);
        });

        expect(result.current.cart.length).toBe(0);
    });

    test("清空购物车", () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(mockProduct);
            result.current.clear();
        });

        expect(result.current.cart.length).toBe(0);
    });
});
