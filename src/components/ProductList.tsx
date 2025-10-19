import React from "react";
import { View } from "react-native";
import ProductItem from "./ProductItem";
import { products } from "../data/products";

const ProductList: React.FC = () => (
    <View>
        {products.map((p) => (
            <ProductItem key={p.id} product={p} />
        ))}
    </View>
);

export default ProductList;
