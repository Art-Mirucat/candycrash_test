// 资源管理器
class ResourceManager {
    constructor() {
        this.images = {};
        this.sounds = {};
        this.loaded = 0;
        this.total = 0;
        this.onComplete = null;
    }

    // 加载所有资源
    loadAll(callback) {
        this.onComplete = callback;

        // 图片资源列表
        const imageSources = {
            'red': 'images/candies/red.png',
            'yellow': 'images/candies/yellow.png',
            'blue': 'images/candies/blue.png',
            'green': 'images/candies/green.png',
            'bomb': 'images/candies/bomb.png',
            'rainbow': 'images/candies/rainbow.png',
            'striped_h': 'images/candies/stripe_h.png',
            'striped_v': 'images/candies/stripe_v.png',
            'mascot_happy': 'images/mascot/happy.png',
            'mascot_sad': 'images/mascot/sad.png',
            'mascot_nervous': 'images/mascot/nervous.png',
            'background': 'images/ui/background.png',
            'game_over': 'images/ui/game_over.png'
        };

        // 音频资源列表
        const soundSources = {
            'bgm': 'sounds/bgm.MP3',
            'match': 'sounds/match.MP3',
            'special': 'sounds/special.MP3',
            'swap': 'sounds/swap.MP3'
        };

        this.total = Object.keys(imageSources).length + Object.keys(soundSources).length;

        // 加载图片
        for (let key in imageSources) {
            this.loadImage(key, imageSources[key]);
        }

        // 加载音频
        for (let key in soundSources) {
            this.loadSound(key, soundSources[key]);
        }
    }

    loadImage(key, src) {
        const img = new Image();
        img.onload = () => this.resourceLoaded();
        img.onerror = () => {
            console.error(`Failed to load image: ${src}`);
            this.resourceLoaded(); // 即使失败也继续，避免卡死
        };
        img.src = src;
        this.images[key] = img;
    }

    loadSound(key, src) {
        const audio = new Audio();
        audio.oncanplaythrough = () => {
             // 只要创建了对象就算加载
        };
        // 为了确保计数正确，在设置src后直接视为加载完成，因为音频可以在后台缓冲
        audio.src = src;
        this.sounds[key] = audio;
        this.resourceLoaded();
    }

    resourceLoaded() {
        this.loaded++;
        if (this.loaded >= this.total) {
            if (this.onComplete) {
                this.onComplete();
            }
        }
    }

    getImage(key) {
        return this.images[key];
    }

    playSound(key) {
        if (this.sounds[key]) {
            // 克隆节点以支持重叠播放
            const sound = this.sounds[key].cloneNode();
            sound.volume = 0.5; // 默认音量
            sound.play().catch(e => console.log("Audio play failed (user interaction needed first):", e));
        }
    }
    
    playBGM() {
        if (this.sounds['bgm']) {
            this.sounds['bgm'].loop = true;
            this.sounds['bgm'].volume = 0.3;
            this.sounds['bgm'].play().catch(e => console.log("BGM play failed:", e));
        }
    }
}

const resources = new ResourceManager();
