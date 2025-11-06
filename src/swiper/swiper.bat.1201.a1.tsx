import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    View,
    ScrollView,
    Dimensions,
    Image,
    StyleSheet,
    LayoutChangeEvent,
    GestureResponderEvent,
} from "react-native";
import {NativeSyntheticEvent} from "react-native/Libraries/Types/CoreEventTypes";
import {NativeScrollEvent} from "react-native/Libraries/Components/ScrollView/ScrollView";

const data = [
    {id: "1", uri: "https://picsum.photos/400/200?1"},
    {id: "2", uri: "https://picsum.photos/400/200?2"},
    {id: "3", uri: "https://picsum.photos/400/200?3"},
    {id: "4", uri: "https://picsum.photos/400/200?4"},
    {id: "5", uri: "https://picsum.photos/400/200?5"},
];

export const Carousel: React.FC = () => {
    const scrollRef = useRef<ScrollView>(null);
    const indexRef = useRef(1);
    const dragStartOffsetRef = useRef(0);
    const currentOffsetRef = useRef(0);
    const didSnapRef = useRef(false);
    const isPointerActiveRef = useRef(false);
    const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [containerWidth, setContainerWidth] = useState(
        () => Dimensions.get("window").width,
    );
    const [index, setIndex] = useState(1);

    const itemWidth = containerWidth > 0 ? containerWidth / 2 : 0;

    const loopData = useMemo(() => {
        if (!data.length) return [];
        return [data[data.length - 1], ...data, data[0]];
    }, []);

    const realCount = data.length;
    const totalCount = loopData.length;

    const handleLayout = (e: LayoutChangeEvent) => {
        const {width} = e.nativeEvent.layout;
        if (width) {
            setContainerWidth(width);
        }
    };

    const clearAutoTimer = useCallback(() => {
        if (autoTimerRef.current) {
            clearTimeout(autoTimerRef.current);
            autoTimerRef.current = null;
        }
    }, []);

    const scrollToIndex = useCallback(
        (targetIndex: number, animated = true) => {
            if (!scrollRef.current || !itemWidth) return;
            const clamped = Math.max(0, Math.min(targetIndex, totalCount - 1));
            scrollRef.current.scrollTo({
                x: clamped * itemWidth,
                animated,
            });
            currentOffsetRef.current = clamped * itemWidth;
        },
        [itemWidth, totalCount],
    );

    const adjustIndex = useCallback(
        (targetIndex: number) => {
            if (!itemWidth) return;

            if (targetIndex <= 0) {
                const resetIndex = realCount;
                indexRef.current = resetIndex;
                setIndex(resetIndex);
                requestAnimationFrame(() => scrollToIndex(resetIndex, false));
                return;
            }

            if (targetIndex >= totalCount - 1) {
                const resetIndex = 1;
                indexRef.current = resetIndex;
                setIndex(resetIndex);
                requestAnimationFrame(() => scrollToIndex(resetIndex, false));
                return;
            }

            indexRef.current = targetIndex;
            setIndex(targetIndex);
        },
        [itemWidth, realCount, scrollToIndex, totalCount],
    );

    const scheduleAdjust = useCallback(
        (targetIndex: number, delay = 200) => {
            if (resetTimeoutRef.current) {
                clearTimeout(resetTimeoutRef.current);
            }
            if (targetIndex <= 0 || targetIndex >= totalCount - 1) {
                resetTimeoutRef.current = setTimeout(
                    () => adjustIndex(targetIndex),
                    delay,
                );
            } else {
                adjustIndex(targetIndex);
            }
        },
        [adjustIndex, totalCount],
    );

    const startAutoScroll = useCallback(() => {
        clearAutoTimer();
        if (!itemWidth || totalCount <= 1) return;

        autoTimerRef.current = setTimeout(() => {
            const nextIndex = indexRef.current + 1;
            scrollToIndex(nextIndex, true);
            scheduleAdjust(nextIndex);
            startAutoScroll();
        }, 3000);
    }, [clearAutoTimer, itemWidth, scheduleAdjust, scrollToIndex, totalCount]);

    useEffect(() => {
        return () => {
            clearAutoTimer();
            if (resetTimeoutRef.current) {
                clearTimeout(resetTimeoutRef.current);
            }
        };
    }, [clearAutoTimer]);

    useEffect(() => {
        if (!itemWidth || totalCount <= 1) return;

        requestAnimationFrame(() => scrollToIndex(indexRef.current, false));
        startAutoScroll();
    }, [itemWidth, scrollToIndex, startAutoScroll, totalCount]);

    const beginPointer = () => {
        clearAutoTimer();
        isPointerActiveRef.current = true;
        didSnapRef.current = false;
        dragStartOffsetRef.current = currentOffsetRef.current;
    };

    const endPointer = (velocityX = 0) => {
        const endOffset = currentOffsetRef.current;

        let target = indexRef.current;

        if (!didSnapRef.current && itemWidth) {
            const deltaPx = endOffset - dragStartOffsetRef.current;
            const deltaRatio = deltaPx / itemWidth;
            if (velocityX > 0.05) {
                target = indexRef.current + 1;
            } else if (velocityX < -0.05) {
                target = indexRef.current - 1;
            } else if (deltaRatio > 0.02) {
                target = indexRef.current + 1;
            } else if (deltaRatio < -0.02) {
                target = indexRef.current - 1;
            } else {
                target = Math.round(endOffset / itemWidth);
            }
            scrollToIndex(target, true);
            scheduleAdjust(target);
        } else if (itemWidth) {
            target = Math.round(endOffset / itemWidth);
            scheduleAdjust(target);
        }

        isPointerActiveRef.current = false;
        didSnapRef.current = false;
        dragStartOffsetRef.current = currentOffsetRef.current;
        startAutoScroll();
    };

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        currentOffsetRef.current = offsetX;

        if (!isPointerActiveRef.current || didSnapRef.current || !itemWidth) {
            return;
        }

        const deltaPx = offsetX - dragStartOffsetRef.current;
        const deltaRatio = deltaPx / itemWidth;

        if (deltaRatio > 0.02) {
            const target = indexRef.current + 1;
            didSnapRef.current = true;
            scrollToIndex(target, true);
            scheduleAdjust(target);
        } else if (deltaRatio < -0.02) {
            const target = indexRef.current - 1;
            didSnapRef.current = true;
            scrollToIndex(target, true);
            scheduleAdjust(target);
        }
    };

    const handleScrollBeginDrag = () => beginPointer();

    const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
        endPointer(e.nativeEvent.velocity?.x ?? 0);

    const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!itemWidth) return;
        const offsetX = e.nativeEvent.contentOffset.x;
        scheduleAdjust(Math.round(offsetX / itemWidth));
    };

    const handleTouchStart = (_e: GestureResponderEvent) => beginPointer();
    const handleTouchEnd = (_e: GestureResponderEvent) => endPointer();
    const handleTouchCancel = (_e: GestureResponderEvent) => endPointer();

    return (
        <View style={styles.container} onLayout={handleLayout}>
            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={itemWidth || undefined}
                decelerationRate="fast"
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onScrollBeginDrag={handleScrollBeginDrag}
                onScrollEndDrag={handleScrollEndDrag}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
                onMomentumScrollEnd={handleMomentumEnd}
                contentContainerStyle={styles.scrollContent}
            >
                {loopData.map((item, idx) => (
                    <View
                        key={`${item.id}-${idx}`}
                        style={[styles.item, {width: itemWidth || undefined}]}
                    >
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
};

const styles = StyleSheet.create({
    container: {
        height: 200,
        width: "100%",
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
        backgroundColor: "#f0f0f0",
    },
});
