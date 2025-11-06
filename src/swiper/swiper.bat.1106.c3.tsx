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
 * 真实数据源：用户可替换为接口返回的数据。
 * 在无限循环的实现中，首尾会额外复制，这里保持纯净数组即可。
 */
const data = [
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
 * 无限轮播组件：
 * - 支持动态尺寸（WAP 自适应），自动计算单列宽度；
 * - 首尾添加哨兵元素，结合瞬移完成无缝循环；
 * - 在手势拖拽时立刻触发列切换（无需等待 3 秒自动轮播）；
 * - 自动轮播与手势互斥，手势结束后自动恢复；
 * - 角标显示当前所在列号（剔除哨兵）/总列数。
 */
export const Carousel: React.FC = () => {
    /** 原生 ScrollView 的引用，用于手动控制偏移 */
    const scrollRef = useRef<ScrollView>(null);

    /** 当前“逻辑索引”（包含首尾哨兵），用于计算下一列以及瞬移位置 */
    const indexRef = useRef(1);

    /** 拖拽开始时的 contentOffset.x，用于判定拖动方向与距离 */
    const dragStartOffsetRef = useRef(0);

    /** 当前 contentOffset.x（每次 onScroll 更新） */
    const currentOffsetRef = useRef(0);

    /** 拖拽过程中是否已经触发过一次翻页，避免在一次手势内重复翻页 */
    const didSnapRef = useRef(false);

    /** 标记是否处于手势/指针操作中（Chrome WAP 依赖 touch 事件） */
    const isPointerActiveRef = useRef(false);

    /** 首尾哨兵瞬移前的延迟定时器；需要在多处清理 */
    const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** 自动轮播定时器；手势触发时暂停，结束后重启 */
    const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** ScrollView 容器宽度；初始使用屏幕宽度，后续 onLayout 动态覆盖 */
    const [containerWidth, setContainerWidth] = useState(
        () => Dimensions.get("window").width,
    );

    /** 组件内通过 setState 同步的索引（便于触发渲染） */
    const [index, setIndex] = useState(1);

    /**
     * 单列宽度计算规则：
     * - 容器宽度的一半（此处一屏显示两列）；
     * - 若容器尚未布局完成，则保持为 0。
     */
    const itemWidth = containerWidth > 0 ? containerWidth / 2 : 0;

    /**
     * 构造首尾哨兵：
     * - 在真实数据前插入最后一项；
     * - 在真实数据后追加第一项；
     * - 这样即可在边界时瞬移到真实序列，实现“无限”循环。
     */
    const loopData = useMemo(() => {
        if (!data.length) return [];
        return [data[data.length - 1], ...data, data[0]];
    }, []);

    /** 真实可见列数（不包含哨兵） */
    const realCount = data.length;

    /** 实际渲染的元素数量（包含哨兵） */
    const totalCount = loopData.length;

    /**
     * 供 UI 角标显示的索引：
     * - 剔除首尾哨兵；
     * - 映射成 1 ~ realCount；
     * - 边界瞬移期间也能保证数值正确。
     */
    const displayIndex = useMemo(() => {
        if (!realCount) return 0;
        if (index <= 0) return realCount;
        if (index > realCount) return 1;
        return index;
    }, [index, realCount]);

    /**
     * 容器尺寸变化（包括 Chrome DevTools 切换 WAP）时更新宽度，
     * 触发重新计算 itemWidth。
     */
    const handleLayout = (e: LayoutChangeEvent) => {
        const {width} = e.nativeEvent.layout;
        if (width) {
            setContainerWidth(width);
        }
    };

    /** 清理自动轮播定时器，防止重复或内存泄漏 */
    const clearAutoTimer = useCallback(() => {
        if (autoTimerRef.current) {
            clearTimeout(autoTimerRef.current);
            autoTimerRef.current = null;
        }
    }, []);

    /**
     * 滚动到指定逻辑索引：
     * - 可选择是否带动画；
     * - 自动裁剪索引范围，避免越界；
     * - 同时更新 currentOffsetRef 以便后续计算。
     */
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

    /**
     * 哨兵重置逻辑：
     * - 若滑到最左侧的哨兵（索引 0），瞬移到真实末尾（索引 realCount）；
     * - 若滑到最右侧的哨兵（索引 totalCount - 1），瞬移到真实开头（索引 1）；
     * - 其他情况直接同步索引状态。
     */
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

    /**
     * 为避免动画尚未结束就瞬移导致闪烁，
     * 边界重置时会延迟一点时间再执行 adjustIndex。
     */
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

    /**
     * 自动轮播：
     * - 每 3 秒滚动到下一列；
     * - 自动轮播与手势互斥：手势开始时暂停，结束后重启；
     * - 通过递归 setTimeout 而非 setInterval，可确保节奏更加可控。
     */
    const startAutoScroll = useCallback(() => {
        clearAutoTimer();
        if (!itemWidth || totalCount <= 1) return;

        autoTimerRef.current = setTimeout(() => {
            const nextIndex = indexRef.current + 1;
            scrollToIndex(nextIndex, true);
            scheduleAdjust(nextIndex);
            startAutoScroll();
        }, 1200);
    }, [clearAutoTimer, itemWidth, scheduleAdjust, scrollToIndex, totalCount]);

    /**
     * 组件卸载/依赖更新时，清理所有定时器，防止逻辑脏读。
     */
    useEffect(() => {
        return () => {
            clearAutoTimer();
            if (resetTimeoutRef.current) {
                clearTimeout(resetTimeoutRef.current);
            }
        };
    }, [clearAutoTimer]);

    /**
     * 当 itemWidth 计算完成后：
     * - 首帧定位到逻辑索引 1（真实第一列）；
     * - 启动自动轮播。
     */
    useEffect(() => {
        if (!itemWidth || totalCount <= 1) return;

        requestAnimationFrame(() => scrollToIndex(indexRef.current, false));
        startAutoScroll();
    }, [itemWidth, scrollToIndex, startAutoScroll, totalCount]);

    /**
     * 手势/指针开始：
     * - 暂停自动轮播；
     * - 标记手势激活，记录起点偏移；
     * - 重置 didSnap，保证新的手势可以再次触发翻页。
     */
    const beginPointer = () => {
        clearAutoTimer();
        isPointerActiveRef.current = true;
        didSnapRef.current = false;
        dragStartOffsetRef.current = currentOffsetRef.current;
    };

    /**
     * 手势/指针结束：
     * - 根据拖拽距离或释放速度判断最终要切换的列；
     * - 若手势过程中已经触发过翻页，则只需做一次索引对齐；
     * - 结束后恢复自动轮播。
     */
    const endPointer = (velocityX = 0) => {
        const endOffset = currentOffsetRef.current;
        let target = indexRef.current;

        didSnapRef.current = false;
        isPointerActiveRef.current = false;

        if (!didSnapRef.current && itemWidth) {
            console.log('huangbaba endPointer 2')
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

            console.log('huangbaba endPointer 3')
            scrollToIndex(target, true);
            scheduleAdjust(target);
        } else if (itemWidth) {
            target = Math.round(endOffset / itemWidth);
            scheduleAdjust(target);
        }

        dragStartOffsetRef.current = currentOffsetRef.current;
        // startAutoScroll();
    };

    /**
     * 滚动过程：
     * - 实时记录当前 offset；
     * - 若处于手势状态且尚未翻页，只要拖拽距离超过 2% 即刻执行翻页。
     *   这样在 Chrome WAP 上轻微拖动也能立刻切换，而不用等惯性或 3 秒定时。
     */
    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        currentOffsetRef.current = offsetX;

        if (!isPointerActiveRef.current || didSnapRef.current || !itemWidth) {
            return;
        }

        const deltaPx = offsetX - dragStartOffsetRef.current;
        const deltaRatio = deltaPx / itemWidth;

        if (deltaRatio > 0.02) {
            console.log('huangbaba endPointer 0')
            const target = indexRef.current + 1;
            didSnapRef.current = true;
            scrollToIndex(target, true);
            scheduleAdjust(target);
        } else if (deltaRatio < -0.02) {
            console.log('huangbaba endPointer 1')
            const target = indexRef.current - 1;
            didSnapRef.current = true;
            scrollToIndex(target, true);
            scheduleAdjust(target);
        }
    };

    /**
     * 原生端的惯性滚动结束事件：
     * - 在 RN iOS/Android 上通常由 onMomentumScrollEnd 触发；
     * - WAP 端可能不触发，但不影响整体逻辑。
     */
    const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!itemWidth) return;
        const offsetX = e.nativeEvent.contentOffset.x;
        scheduleAdjust(Math.round(offsetX / itemWidth));
    };

    /**
     * Chrome WAP 上 ScrollView 不论是鼠标还是触摸都会触发 touch 事件，
     * 因此额外绑定 onTouchStart / onTouchEnd / onTouchCancel，保证 begin/endPointer
     * 在 Web 端也能正常工作。
     */
    const handleTouchStart = (_e: GestureResponderEvent) => beginPointer();
    const handleTouchEnd = (_e: GestureResponderEvent) => endPointer();
    const handleTouchCancel = (_e: GestureResponderEvent) => endPointer();

    /**
     * RN 原生端（含模拟器）在拖拽结束会触发 onScrollEndDrag，
     * e.nativeEvent.velocity.x 可用于判断抛掷速度。
     */
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
                scrollEventThrottle={16} // 高频采样，保证拖拽逻辑灵敏
                onScrollBeginDrag={beginPointer}
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

            {/* 右下角角标展示当前所在列（从 1 开始）/总列数 */}
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

const styles = StyleSheet.create({
    container: {
        height: 200,
        width: "100%",
        position: "relative", // 便于定位右下角角标
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
