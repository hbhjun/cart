import React from "react";
import {View, AppRegistry, ScrollView} from "react-native";
import {CartProvider} from "./context/CartContext";
import ProductList from "./components/ProductList";
import Cart from "./components/Cart";
import {Carousel} from "./swiper/swiper";


const App = () => (
    <CartProvider>
        <ScrollView style={{padding: 20}}>
            <View style={{padding: 20}}>
                {/*<ProductList/>*/}
                {/*<Cart/>*/}
                <Carousel/>
            </View>
        </ScrollView>
    </CartProvider>
);

AppRegistry.registerComponent("MainApp", () => App);

AppRegistry.runApplication("MainApp", {
    rootTag: document.getElementById("root"),
});
