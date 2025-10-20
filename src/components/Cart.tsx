import React from "react";
import { View, Text, Button } from "react-native";
import { useCart } from "../context/CartContext";

const Cart = () => {
    const { cart, increase, decrease, remove, clear } = useCart();
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (cart.length === 0) {
        return (
            <View style={{ marginTop: 20 }}>
                <Text>购物车是空的。</Text>
            </View>
        );
    }

    return (
        <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>🛒 购物车</Text>
            {cart.map(item => (
                <View
                    key={item.id}
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                        borderBottomWidth: 1,
                        borderColor: "#ddd",
                        paddingBottom: 6,
                    }}
                >
                    <View>
                        <Text>{item.name}</Text>
                        <Text>价格: ¥{item.price}</Text>
                        <Text>数量: {item.quantity}</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                        <Button title="＋" onPress={() => increase(item.id)} />
                        <Button title="－" onPress={() => decrease(item.id)} />
                        <Button title="删除" color="red" onPress={() => remove(item.id)} />
                    </View>
                </View>
            ))}

            {cart.map((item) => (
                <Text key={item.id}>
                    {item.name} × {item.quantity}
                </Text>
            ))}
            <Text>总价: ¥{total}</Text>

            <Button title="清空购物车" color="red" onPress={clear} />
        </View>
    );
};

export default Cart;
