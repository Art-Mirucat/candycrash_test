// 游戏常量定义

// 棋盘大小
const ROWS = 10; // 行数(高)
const COLS = 8;  // 列数(宽)

// 游戏时间
const GAME_DURATION = 60; // 秒

// 糖果类型
const CANDY_TYPE = {
    RED: 'red',
    YELLOW: 'yellow',
    BLUE: 'blue',
    GREEN: 'green',
    // 特殊糖果基础类型可以复用颜色，但有特殊标记
    RANDOM: 'random' // 用于生成时
};

// 糖果状态
const CANDY_STATE = {
    IDLE: 'idle',
    SELECTED: 'selected',
    SWAPPING: 'swapping',
    FALLING: 'falling',
    MATCHED: 'matched',
    EXPLODING: 'exploding'
};

// 特殊糖果类型
const SPECIAL_TYPE = {
    NONE: 'none',
    STRIPED_H: 'striped_h', // 横向条纹
    STRIPED_V: 'striped_v', // 纵向条纹
    BOMB: 'bomb',           // 炸弹
    RAINBOW: 'rainbow'      // 彩虹糖
};

// 分数配置
const SCORE = {
    MATCH_3: 60,
    MATCH_4: 120,
    MATCH_5: 200,
    STRIPED: 300,
    BOMB: 500,
    RAINBOW: 1000,
    COMBO_MULTIPLIER: 1.1 // 连击加成
};

// 动画持续时间 (毫秒)
const ANIMATION_TIME = {
    SWAP: 100,
    FALL: 60, // 每格下落时间
    EXPLODE: 80 //糖果消失的时间
};
