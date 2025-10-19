// jest.config.js
module.exports = {
    preset: "react-native", // 使用 React Native 预设（能兼容 React Native Web）
    transform: {
        "^.+\\.[jt]sx?$": "babel-jest", // 用 babel-jest 转译 ES6 / JSX
    },
    moduleNameMapper: {
        "^react-native$": "react-native-web", // 映射到 web 实现
    },
    testEnvironment: "jsdom", // 模拟浏览器环境（React Native Web 依赖 DOM）
    setupFilesAfterEnv: ["@testing-library/jest-dom"], // 启用 jest-dom 扩展匹配器
    transformIgnorePatterns: [
        "node_modules/(?!(react-native|react-native-web|@react-native|react-clone-referenced-element)/)",
    ],
};
