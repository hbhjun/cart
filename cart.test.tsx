import * as React from 'react';
import { CartProvider } from "./src/context/CartContext";
import ProductList from "./src/components/ProductList";
import Cart from "./src/components/Cart";
import { products } from "./src/data/products";
import { fireEvent,  render } from "@testing-library/react-native";
import {getByTestId} from "@testing-library/react";


describe("Cart Component", () => {
    test("添加商品到购物车", () => {
        const screen = render(
            <CartProvider>
                <ProductList />
                <Cart />
            </CartProvider>
        );



        // 点击加入购物车
        fireEvent.press(screen.getByTestId("abc"));

        // 购物车中应该显示商品
        expect(getByText(products[0].name)).toBeTruthy();
        expect(getByText("数量: 1")).toBeTruthy();
    });

    test("增加商品数量", () => {
        const { getByText } = render(
            <CartProvider>
                <ProductList />
                <Cart />
            </CartProvider>
        );

        fireEvent.press(getByText("加入购物车")); // 数量 1
        fireEvent.press(getByText("＋"));          // 数量 2

        expect(getByText("数量: 2")).toBeTruthy();
    });

    test("减少商品数量", () => {
        const { getByText, queryByText } = render(
            <CartProvider>
                <ProductList />
                <Cart />
            </CartProvider>
        );

        fireEvent.press(getByText("加入购物车")); // 数量 1
        fireEvent.press(getByText("＋"));          // 数量 2
        fireEvent.press(getByText("－"));          // 数量回到 1

        expect(getByText("数量: 1")).toBeTruthy();

        // 再减一次，商品应该被移除
        fireEvent.press(getByText("－"));
        expect(queryByText(products[0].name)).toBeNull();
    });

    test("删除单个商品", () => {
        const { getByText, queryByText } = render(
            <CartProvider>
                <ProductList />
                <Cart />
            </CartProvider>
        );

        fireEvent.press(getByText("加入购物车"));
        fireEvent.press(getByText("删除"));

        expect(queryByText(products[0].name)).toBeNull();
    });

    test("清空购物车", () => {
        const { getByText, queryByText } = render(
            <CartProvider>
                <ProductList />
                <Cart />
            </CartProvider>
        );

        fireEvent.press(getByText("加入购物车"));
        fireEvent.press(getByText("清空购物车"));

        expect(queryByText(products[0].name)).toBeNull();
    });

    test("超过库存数量提示库存不足", () => {
        const { getByText } = render(
            <CartProvider>
                <ProductList />
                <Cart />
            </CartProvider>
        );

        // mock alert
        global.alert = jest.fn();

        // 假设产品库存为 2
        fireEvent.press(getByText("加入购物车")); // 1
        fireEvent.press(getByText("加入购物车")); // 2
        fireEvent.press(getByText("加入购物车")); // 3 -> 超库存

        expect(global.alert).toHaveBeenCalledWith("库存不足");
    });
});
