import React, {useRef, useState, useEffect} from "react";
import {View, ScrollView, Dimensions, Image, StyleSheet} from "react-native";
import {NativeSyntheticEvent} from "react-native/Libraries/Types/CoreEventTypes";
import {NativeScrollEvent} from "react-native/Libraries/Components/ScrollView/ScrollView";

const {width} = Dimensions.get("window");
const ITEM_WIDTH = width / 2; // 一屏两列
const data = [
    {id: "1", uri: "https://picsum.photos/400/200?1"},
    {id: "2", uri: "https://picsum.photos/400/200?2"},
    {id: "3", uri: "https://picsum.photos/400/200?3"},
    {id: "4", uri: "https://picsum.photos/400/200?4"},
    {id: "5", uri: "https://picsum.photos/400/200?5"},
];

export const Carousel: React.FC<{  }> = () => {
    const scrollRef = useRef<ScrollView>(null);
    const [index, setIndex] = useState(1);

    // 创建首尾拼接，实现无限循环
    const loopData = [
        data[data.length - 1], // 最后一个加到最前面
        ...data,
        data[0], // 第一个加到最后
    ];

    // 初始化到第1个（实际是原数组的第0个）
    useEffect(() => {
        setTimeout(() => {
            scrollRef.current?.scrollTo({x: ITEM_WIDTH, animated: false});
        }, 0);
    }, []);

    // 监听滚动结束，计算当前索引并做循环重置
    const onMomentumScrollEnd = (e:NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        const newIndex = Math.round(offsetX / ITEM_WIDTH);
        setIndex(newIndex);

        if (newIndex === 0) {
            // 滑到最前，瞬移到倒数第二个
            setTimeout(() => {
                scrollRef.current?.scrollTo({
                    x: ITEM_WIDTH * (data.length),
                    animated: false,
                });
                setIndex(data.length);
            }, 50);
        } else if (newIndex === loopData.length - 1) {
            // 滑到最后，瞬移到第1个
            setTimeout(() => {
                scrollRef.current?.scrollTo({
                    x: ITEM_WIDTH,
                    animated: false,
                });
                setIndex(1);
            }, 50);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_WIDTH} // 每次滚动 1 列
                decelerationRate="fast"
                onMomentumScrollEnd={onMomentumScrollEnd}
                contentContainerStyle={styles.scrollContent}
            >
                {loopData.map((item, i) => (
                    <View key={i} style={[styles.item, {width: ITEM_WIDTH}]}>
                        <Image
                            source={{uri: item.uri}}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 200,
    },
    scrollContent: {
        alignItems: "center",
    },
    item: {
        paddingHorizontal: 5,
    },
    image: {
        width: "100%",
        height: 180,
        borderRadius: 12,
    },
});
