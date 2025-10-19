// import React from "react";
// import expect from "expect";
// import { render, fireEvent } from "@testing-library/react-native";
// import { CartProvider } from "../src/context/CartContext";
// import ProductList from "../src/components/ProductList";
// import Cart from "../src/components/Cart";
//
// test("添加商品到购物车", () => {
//     const { getByText } = render(
//         <CartProvider>
//             <ProductList />
//             <Cart />
//         </CartProvider>
//     );
//
//     const addButton = getByText("添加到购物车");
//     fireEvent.press(addButton);
//
//     expect(getByText(/iPhone 15 × 1/)).toBeTruthy();
// });
