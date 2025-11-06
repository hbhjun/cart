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
    Text,
} from "react-native";
import {NativeSyntheticEvent} from "react-native/Libraries/Types/CoreEventTypes";
import {NativeScrollEvent} from "react-native/Libraries/Components/ScrollView/ScrollView";

/**
 * 轮播项的数据结构；真实项目中可由接口返回。
 */
type CarouselItem = {
    id: string;
    uri: string;
};

/**
 * 一列包含的元素集合（此处一列放 2 张图）。
 */
type CarouselColumn = CarouselItem[];

/**
 * 静态 mock 数据：15 张图片。
 */
const data: CarouselItem[] = [
    {id: "1", uri: "https://picsum.photos/400/200?1"},
    {id: "2", uri: "https://picsum.photos/400/200?2"},
    {id: "3", uri: "https://picsum.photos/400/200?3"},
    {id: "4", uri: "https://picsum.photos/400/200?4"},
    {id: "5", uri: "https://picsum.photos/400/200?5"},
    {id: "6", uri: "https://picsum.photos/400/200?6"},
    {id: "7", uri: "https://picsum.photos/400/200?7"},
    {id: "8", uri: "https://picsum.photos/400/200?8"},
    {id: "9", uri: "https://picsum.photos/400/200?9"},
    {id: "10", uri: "https://picsum.photos/400/200?10"},
    {id: "11", uri: "https://picsum.photos/400/200?11"},
    {id: "12", uri: "https://picsum.photos/400/200?12"},
    {id: "13", uri: "https://picsum.photos/400/200?13"},
    {id: "14", uri: "https://picsum.photos/400/200?14"},
    {id: "15", uri: "https://picsum.photos/400/200?15"},
];

/**
 * 行为参数：阈值、自动轮播间隔、复位延迟。
 */
const SNAP_DISTANCE_RATIO = 0.02;     // 拖拽超过列宽 2% 立即翻页
const SNAP_VELOCITY_THRESHOLD = 0.05; // 拖拽结束时的速度阈值
const RESET_DELAY_MS = 200;           // 首尾瞬移延迟
const AUTO_SCROLL_INTERVAL_MS = 3000; // 自动轮播间隔（3 秒）

/**
 * 无限循环的双列图片轮播组件。
 */
export const Carousel: React.FC = () => {
    /** ScrollView 引用，用于手动控制滚动位置 */
    const scrollRef = useRef<ScrollView>(null);

    /**
     * “逻辑索引”：
     * - 包含首尾哨兵元素；
     * - `1 ~ realCount` 表示真实列；
     * - `0` 表示左侧哨兵，`totalCount - 1` 表示右侧哨兵。
     */
    const indexRef = useRef(1);

    /** 当前用于渲染的索引（触发 UI 更新） */
    const [currentIndex, setCurrentIndex] = useState(1);

    /** 拖拽起点与实时偏移量，用于计算手势位移 */
    const dragStartOffsetRef = useRef(0);
    const currentOffsetRef = useRef(0);

    /** 手势过程中是否已经触发过自动翻页 */
    const didSnapRef = useRef(false);

    /** 是否处于手势/指针操作中（Chrome WAP 依赖 touch 事件） */
    const isPointerActiveRef = useRef(false);

    /** 首尾瞬移的延迟执行器（使用 setInterval 充当一次性定时器） */
    const resetIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /** 自动轮播的定时器引用（setInterval） */
    const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /** ScrollView 的容器宽度，初始值取屏幕宽度，后续由 onLayout 更新 */
    const [containerWidth, setContainerWidth] = useState(
        () => Dimensions.get("window").width,
    );

    /**
     * 列宽：
     * - 一屏 2 列，所以取容器宽度的一半；
     * - 在布局未完成时保持为 0，避免错误滚动。
     */
    const itemWidth = containerWidth > 0 ? containerWidth / 2 : 0;

    /**
     * 将原始数据按“2 个一组”切分成列。
     * 例如 15 张图 => 8 列（最后一列只有 1 张）。
     */
    const columns = useMemo<CarouselColumn[]>(() => {
        if (!data.length) return [];
        const result: CarouselColumn[] = [];
        for (let i = 0; i < data.length; i += 2) {
            result.push(data.slice(i, i + 2));
        }
        return result;
    }, []);

    /**
     * 为实现无限循环，额外在首尾各添加一个“哨兵列”：
     * - 首部插入最后一列；
     * - 尾部追加第一列；
     * - 真正可见的列数 = columns.length。
     */
    const loopData = useMemo<CarouselColumn[]>(() => {
        if (!columns.length) return [];
        return [columns[columns.length - 1], ...columns, columns[0]];
    }, [columns]);

    /** 真实列数（不含哨兵），用于角标显示与越界处理 */
    const realCount = columns.length;

    /** 轮播总列数（含哨兵） */
    const totalCount = loopData.length;

    /**
     * 角标显示的索引：
     * - 取 currentIndex，在首尾瞬移时回落到合法范围。
     */
    const displayIndex = useMemo(() => {
        if (!realCount) return 0;
        if (currentIndex <= 0) return realCount;
        if (currentIndex > realCount) return 1;
        return currentIndex;
    }, [currentIndex, realCount]);

    /** 容器尺寸变化时更新宽度，支持 WAP 自适应 */
    const handleLayout = (e: LayoutChangeEvent) => {
        const {width} = e.nativeEvent.layout;
        if (width) {
            setContainerWidth(width);
        }
    };

    /** 同步 indexRef 与 currentIndex，保持状态一致 */
    const syncIndex = useCallback((value: number) => {
        indexRef.current = value;
        setCurrentIndex(value);
    }, []);

    /** 清除自动轮播定时器 */
    const clearAutoInterval = useCallback(() => {
        if (autoIntervalRef.current) {
            clearInterval(autoIntervalRef.current);
            autoIntervalRef.current = null;
        }
    }, []);

    /** 清除首尾瞬移的定时器 */
    const clearResetInterval = useCallback(() => {
        if (resetIntervalRef.current) {
            clearInterval(resetIntervalRef.current);
            resetIntervalRef.current = null;
        }
    }, []);

    /**
     * 滚动到指定逻辑索引。
     * - `targetIndex` 在函数内被裁剪到合法范围；
     * - 支持是否启用动画；
     * - 同步更新 currentOffsetRef，方便手势计算。
     */
    const scrollToIndex = useCallback(
        (targetIndex: number, animated = true) => {
            if (!scrollRef.current || !itemWidth || totalCount === 0) {
                return;
            }
            const clamped = Math.max(0, Math.min(targetIndex, totalCount - 1));
            scrollRef.current.scrollTo({
                x: clamped * itemWidth,
                animated,
            });
            currentOffsetRef.current = clamped * itemWidth;
        },
        [itemWidth, totalCount],
    );

    /**
     * 调整索引并在必要时瞬移到真实内容：
     * - 左哨兵（0）瞬移到真实最后一列；
     * - 右哨兵（totalCount - 1）瞬移到真实第一列；
     * - 其他情况直接同步索引。
     */
    const adjustIndex = useCallback(
        (targetIndex: number) => {
            if (!itemWidth || !realCount) return;

            if (targetIndex <= 0) {
                const resetIndex = realCount;
                syncIndex(resetIndex);
                requestAnimationFrame(() => scrollToIndex(resetIndex, false));
                return;
            }

            if (targetIndex >= totalCount - 1) {
                const resetIndex = 1;
                syncIndex(resetIndex);
                requestAnimationFrame(() => scrollToIndex(resetIndex, false));
                return;
            }

            syncIndex(targetIndex);
        },
        [itemWidth, realCount, scrollToIndex, syncIndex, totalCount],
    );

    /**
     * 在首尾进行瞬移时，延迟执行 adjustIndex：
     * - 使用 setInterval 充当单次定时器；
     * - 回调执行后立即清理自身。
     */
    const scheduleAdjust = useCallback(
        (targetIndex: number, delay = RESET_DELAY_MS) => {
            clearResetInterval();

            if (targetIndex <= 0 || targetIndex >= totalCount - 1) {
                const intervalId = setInterval(() => {
                    clearInterval(intervalId);
                    if (resetIntervalRef.current === intervalId) {
                        resetIntervalRef.current = null;
                    }
                    adjustIndex(targetIndex);
                }, delay);
                resetIntervalRef.current = intervalId;
            } else {
                adjustIndex(targetIndex);
            }
        },
        [adjustIndex, clearResetInterval, totalCount],
    );

    /**
     * 自动轮播（setInterval）：
     * - 每 3 秒滚动一列；
     * - 手势开始时会暂停，结束后重新启动；
     * - 只有在列数 > 1 且 itemWidth 准备好时才生效。
     */
    const startAutoScroll = useCallback(() => {
        clearAutoInterval();
        if (!itemWidth || totalCount <= 1) return;

        autoIntervalRef.current = setInterval(() => {
            if (!itemWidth || totalCount <= 1) {
                return;
            }
            const nextIndex = indexRef.current + 1;
            scrollToIndex(nextIndex, true);
            scheduleAdjust(nextIndex);
        }, AUTO_SCROLL_INTERVAL_MS);
    }, [clearAutoInterval, itemWidth, scheduleAdjust, scrollToIndex, totalCount]);

    /** 组件卸载时清理所有定时器 */
    useEffect(() => {
        return () => {
            clearAutoInterval();
            clearResetInterval();
        };
    }, [clearAutoInterval, clearResetInterval]);

    /**
     * itemWidth 计算完成后：
     * - 首帧定位到真实第一列（逻辑索引 1）；
     * - 启动自动轮播。
     */
    useEffect(() => {
        if (!itemWidth || totalCount <= 1) return;

        requestAnimationFrame(() => scrollToIndex(indexRef.current, false));
        startAutoScroll();
    }, [itemWidth, scrollToIndex, startAutoScroll, totalCount]);

    /**
     * 手势/指针开始：
     * - 暂停所有定时器；
     * - 记录起点偏移；
     * - 允许本次手势触发一次 snap。
     */
    const beginPointer = () => {
        clearAutoInterval();
        clearResetInterval();
        isPointerActiveRef.current = true;
        didSnapRef.current = false;
        dragStartOffsetRef.current = currentOffsetRef.current;
    };

    /**
     * 手势/指针结束：
     * - 根据速度或位移计算目标列；
     * - 若拖拽过程中尚未 snap，则此处执行一次；
     * - 结束后重启自动轮播。
     */
    const endPointer = (velocityX = 0) => {
        const alreadySnapped = didSnapRef.current;
        didSnapRef.current = false;
        isPointerActiveRef.current = false;

        const endOffset = currentOffsetRef.current;
        let target = indexRef.current;

        if (!alreadySnapped && itemWidth) {
            const deltaPx = endOffset - dragStartOffsetRef.current;
            const deltaRatio = deltaPx / itemWidth;

            if (velocityX > SNAP_VELOCITY_THRESHOLD) {
                target = indexRef.current + 1;
            } else if (velocityX < -SNAP_VELOCITY_THRESHOLD) {
                target = indexRef.current - 1;
            } else if (deltaRatio > SNAP_DISTANCE_RATIO) {
                target = indexRef.current + 1;
            } else if (deltaRatio < -SNAP_DISTANCE_RATIO) {
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

        dragStartOffsetRef.current = currentOffsetRef.current;
        startAutoScroll();
    };

    /**
     * 滚动过程中实时检测拖拽幅度：
     * - 若处于手势状态且尚未触发 snap，只要超过阈值立即翻页；
     * - 这样在 WAP 上“拖一点点”即可切换。
     */
    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        currentOffsetRef.current = offsetX;

        if (!isPointerActiveRef.current || didSnapRef.current || !itemWidth) {
            return;
        }

        const deltaPx = offsetX - dragStartOffsetRef.current;
        const deltaRatio = deltaPx / itemWidth;

        if (deltaRatio > SNAP_DISTANCE_RATIO) {
            const target = indexRef.current + 1;
            didSnapRef.current = true;
            scrollToIndex(target, true);
            scheduleAdjust(target);
        } else if (deltaRatio < -SNAP_DISTANCE_RATIO) {
            const target = indexRef.current - 1;
            didSnapRef.current = true;
            scrollToIndex(target, true);
            scheduleAdjust(target);
        }
    };

    /** 原生端惯性滚动结束时的兜底处理（WAP 端可能不触发） */
    const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!itemWidth) return;
        const offsetX = e.nativeEvent.contentOffset.x;
        scheduleAdjust(Math.round(offsetX / itemWidth));
    };

    /** Chrome WAP 以及部分 WebView 会触发 touch 事件，需在此恢复/暂停轮播 */
    const handleTouchStart = (_e: GestureResponderEvent) => beginPointer();
    const handleTouchEnd = (_e: GestureResponderEvent) => endPointer();
    const handleTouchCancel = (_e: GestureResponderEvent) => endPointer();

    /** RN 原生端的拖拽结束事件，可读取 velocity 判断抛掷方向 */
    const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
        endPointer(e.nativeEvent.velocity?.x ?? 0);

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
                onScrollBeginDrag={beginPointer}
                onScrollEndDrag={handleScrollEndDrag}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
                onMomentumScrollEnd={handleMomentumEnd}
                contentContainerStyle={styles.scrollContent}
            >
                {loopData.map((column, idx) => (
                    <View key={idx.toString()} style={styles.column}>
                        {column.map((item) => (
                            <View
                                key={item.id}
                                style={[styles.item, {width: itemWidth || undefined}]}
                            >
                                <Image
                                    source={{uri: item.uri}}
                                    style={styles.image}
                                    resizeMode="cover"
                                />
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>

            {realCount > 0 && (
                <View style={styles.indexBadge}>
                    <Text style={styles.indexText}>
                        {displayIndex}/{realCount}
                    </Text>
                </View>
            )}
        </View>
    );
};

/**
 * 样式定义。
 */
const styles = StyleSheet.create({
    container: {
        height: 200,
        width: "100%",
        position: "relative", // 用于定位右下角角标
    },
    scrollContent: {
        alignItems: "center",
    },
    column: {
        flexDirection: "row",
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
    indexBadge: {
        position: "absolute",
        right: 12,
        bottom: 12,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    indexText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "500",
    },
});
