import React, { useContext } from "react";
import { View, Text, Button } from "react-native";
import { Product } from "../data/products";
import { CartContext } from "../context/CartContext";

interface Props {
    product: Product;
}

const ProductItem: React.FC<Props> = ({ product }) => {
    const { cart, addToCart } = useContext(CartContext);

    // 当前购物车中该商品数量
    const cartItem = cart.find((item) => item.id === product.id);
    const remainingStock = product.stock - (cartItem?.quantity || 0);

    const handleAddToCart = () => {
        addToCart(product); // 库存逻辑交给 CartProvider 内部验证
    };

    return (
        <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text>{product.name}</Text>
            <Text>价格: ¥{product.price}</Text>
            <Text>库存: {remainingStock >= 0 ? remainingStock : 0}</Text>
            <Text>描述: {product.description}</Text>
            <Button title="添加到购物车" testID={'abc'} onPress={handleAddToCart} />
        </View>
    );
};

export default ProductItem;
