import * as React from 'react';
import { usePageEvent } from 'remax/macro';
import {
    Swiper,
    SwiperItem,
    View,
    Image,
    createSelectorQuery,
    getSystemInfoSync,
} from 'remax/ali';
import './index.css';

const CAROUSEL_DATA = [
    { id: '1', uri: 'https://picsum.photos/400/200?1' },
    { id: '2', uri: 'https://picsum.photos/400/200?2' },
    { id: '3', uri: 'https://picsum.photos/400/200?3' },
    { id: '4', uri: 'https://picsum.photos/400/200?4' },
    { id: '5', uri: 'https://picsum.photos/400/200?5' },
];

const AUTOPLAY_INTERVAL = 3000;

const CarouselPage: React.FC = () => {
    const total = CAROUSEL_DATA.length;
    const [current, setCurrent] = React.useState(0);
    const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const isTouchingRef = React.useRef(false);
    const [swiperMargins, setSwiperMargins] = React.useState({
        previous: '80rpx',
        next: '80rpx',
    });

    const clearTimer = React.useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startAutoPlay = React.useCallback(() => {
        clearTimer();
        if (total <= 1) {
            return;
        }

        timerRef.current = setInterval(() => {
            setCurrent(prev => {
                const next = prev + 1;
                return next >= total ? 0 : next;
            });
        }, AUTOPLAY_INTERVAL);
    }, [clearTimer, total]);

    React.useEffect(() => {
        startAutoPlay();
        return clearTimer;
    }, [startAutoPlay, clearTimer]);

    const updateSwiperMargins = React.useCallback(() => {
        try {
            const query = createSelectorQuery();
            query.select('#carousel-swiper-wrapper').boundingClientRect();
            query.exec(res => {
                const rect = res && res[0];
                if (!rect || !rect.width) {
                    return;
                }

                const systemInfo = getSystemInfoSync?.();
                const windowWidth = systemInfo?.windowWidth || 375;
                if (!windowWidth) {
                    return;
                }

                const halfWidthInRpx = (rect.width / 2) * (750 / windowWidth);
                const formattedHalf = `${Math.max(0, halfWidthInRpx)}rpx`;

                setSwiperMargins(prev => {
                    if (prev.previous === formattedHalf && prev.next === '0rpx') {
                        return prev;
                    }
                    return {
                        previous: formattedHalf,
                        next: '0rpx',
                    };
                });
            });
        } catch (error) {
            // 在非支付宝环境下直接忽略
        }
    }, []);

    usePageEvent('onReady', updateSwiperMargins);
    usePageEvent('onShow', updateSwiperMargins);
    usePageEvent('onResize', updateSwiperMargins);

    React.useEffect(() => {
        updateSwiperMargins();
    }, [updateSwiperMargins]);

    const handleChange = React.useCallback(
        (event: any) => {
            const next = Number(event?.detail?.current ?? 0);
            setCurrent(prev => (prev === next ? prev : next % Math.max(total, 1)));
        },
        [total]
    );

    const handleTouchStart = React.useCallback(() => {
        isTouchingRef.current = true;
        clearTimer();
    }, [clearTimer]);

    const handleTouchEnd = React.useCallback(() => {
        if (!isTouchingRef.current) {
            return;
        }
        isTouchingRef.current = false;
        startAutoPlay();
    }, [startAutoPlay]);

    const handleTouchCancel = React.useCallback(() => {
        if (!isTouchingRef.current) {
            return;
        }
        isTouchingRef.current = false;
        startAutoPlay();
    }, [startAutoPlay]);

    return (
        <View className="carousel-page">
            <View
                id="carousel-swiper-wrapper"
                className="carousel-wrapper"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
            >
                <Swiper
                    className="carousel-swiper"
                    circular
                    current={current}
                    autoplay={false}
                    duration={400}
                    previousMargin={swiperMargins.previous}
                    nextMargin={swiperMargins.next}
                    onChange={handleChange}
                >
                    {CAROUSEL_DATA.map(item => (
                        <SwiperItem key={item.id} className="carousel-item">
                            <View className="carousel-card">
                                <Image className="carousel-image" src={item.uri} mode="aspectFill" />
                            </View>
                        </SwiperItem>
                    ))}
                </Swiper>
            </View>
            <View className="carousel-indicators">
                {CAROUSEL_DATA.map((item, index) => (
                    <View
                        key={item.id}
                        className={
                            index === current
                                ? 'carousel-indicator-dot carousel-indicator-dot__active'
                                : 'carousel-indicator-dot'
                        }
                    />
                ))}
            </View>
        </View>
    );
};

export default CarouselPage;
