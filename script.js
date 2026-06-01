let words = [];
let currentIndex = 0;
let timer = null;
const interval = 100; // Update progress bar every 100ms
let isPaused = false;
let duration = 10000; // Default 10s
let timeLeft = 10000;

const wordEl = document.getElementById('word');
const pinyinEl = document.getElementById('pinyin');
const meaningEl = document.getElementById('meaning');
const counterEl = document.getElementById('counter');
const progressBar = document.getElementById('progress-bar');
const cardEl = document.getElementById('card');
const pauseBtn = document.getElementById('pause');
const speedInput = document.getElementById('speed');
const errorMsg = document.getElementById('error-message');
const fileInput = document.getElementById('csv-file');
const themeToggle = document.getElementById('theme-toggle');
const importBtn = document.getElementById('import-csv');
const localCsvInput = document.getElementById('local-csv-input');
const clockEl = document.getElementById('live-clock');
const weatherEl = document.getElementById('weather-display');
let lastPosition = null;

// Live Clock
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${hours}:${minutes}:${seconds}`;
}
setInterval(updateClock, 1000);
updateClock();

// Weather Logic
async function fetchWeather(forced = false) {
    if (!navigator.geolocation) {
        weatherEl.textContent = "浏览器不支持定位";
        return;
    }

    if (!forced && lastPosition) {
        getWeatherData(lastPosition.latitude, lastPosition.longitude);
        return;
    }

    weatherEl.textContent = "正在获取位置...";
    
    navigator.geolocation.getCurrentPosition(async (position) => {
        lastPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        };
        getWeatherData(lastPosition.latitude, lastPosition.longitude);
    }, (error) => {
        console.error('定位失败:', error);
        weatherEl.textContent = "点击此处手动获取位置";
    }, { timeout: 10000 });
}

async function getWeatherData(lat, lon) {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m&timezone=auto`);
        const data = await response.json();
        
        // Current temp
        const currentTemp = Math.round(data.current_weather.temperature);
        
        // Get next 2 hours
        const now = new Date();
        const currentHour = now.getHours();
        const forecast = [];
        
        for (let i = 1; i <= 2; i++) {
            const nextHourIndex = (currentHour + i) % 24;
            const temp = Math.round(data.hourly.temperature_2m[nextHourIndex]);
            forecast.push(`${nextHourIndex}时:${temp}°`);
        }
        
        weatherEl.textContent = `${currentTemp}°C | 预报: ${forecast.join(' ')}`;
    } catch (error) {
        console.error('天气获取失败:', error);
        weatherEl.textContent = "获取天气失败，点击重试";
    }
}

weatherEl.addEventListener('click', () => {
    fetchWeather(true);
});

fetchWeather();
setInterval(fetchWeather, 30 * 60 * 1000);

// Import Local CSV
importBtn.addEventListener('click', () => {
    localCsvInput.click();
});

localCsvInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            handleLoadedText(event.target.result);
            alert(`已成功加载新库：${file.name}，共 ${words.length} 条数据`);
        };
        reader.readAsText(file);
    }
});

// Theme toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? '切换明亮模式' : '切换黑暗模式';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// Load saved theme
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '切换明亮模式';
}

// Load words from CSV
async function loadWords() {
    try {
        const response = await fetch('words.csv');
        if (!response.ok) throw new Error('Network response was not ok');
        const text = await response.text();
        handleLoadedText(text);
        errorMsg.classList.add('error-hidden');
    } catch (error) {
        console.error('加载CSV失败:', error);
        wordEl.textContent = "请手动加载数据";
        errorMsg.classList.remove('error-hidden');
    }
}

function handleLoadedText(text) {
    words = parseCSV(text);
    if (words.length > 0) {
        displayWord(0);
        startTimer();
    } else {
        wordEl.textContent = "未找到词语数据";
    }
}

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            handleLoadedText(event.target.result);
            errorMsg.classList.add('error-hidden');
        };
        reader.readAsText(file);
    }
});

function parseCSV(text) {
    const lines = text.split('\n');
    const result = [];
    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV split (handles basic cases)
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        if (parts.length >= 1) {
            const word = parts[0].replace(/^"|"$/g, '').trim();
            const meaning = parts.length > 1 ? parts[1].replace(/^"|"$/g, '').trim() : "";
            
            if (word) {
                result.push({
                    word: word,
                    meaning: meaning,
                    pinyin: "" 
                });
            }
        }
    }
    return result;
}

function displayWord(index) {
    if (words.length === 0) return;
    currentIndex = index;
    const wordObj = words[currentIndex];
    
    // Animation
    cardEl.classList.remove('fade-in');
    cardEl.classList.add('fade-out');
    
    setTimeout(() => {
        wordEl.textContent = wordObj.word;
        pinyinEl.textContent = wordObj.pinyin || "";
        // If meaning is empty, show the word itself
        meaningEl.textContent = wordObj.meaning || wordObj.word;
        counterEl.textContent = `${currentIndex + 1} / ${words.length}`;
        
        cardEl.classList.remove('fade-out');
        cardEl.classList.add('fade-in');
    }, 300);
    
    resetTimer();
}

function startTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        if (!isPaused) {
            timeLeft -= interval;
            updateProgress();
            if (timeLeft <= 0) {
                nextWord();
            }
        }
    }, interval);
}

function resetTimer() {
    duration = parseInt(speedInput.value) * 1000;
    timeLeft = duration;
    updateProgress();
}

function updateProgress() {
    const percentage = (timeLeft / duration) * 100;
    progressBar.style.width = `${100 - percentage}%`;
}

function nextWord() {
    if (words.length === 0) return;
    currentIndex = (currentIndex + 1) % words.length;
    displayWord(currentIndex);
}

function prevWord() {
    if (words.length === 0) return;
    currentIndex = (currentIndex - 1 + words.length) % words.length;
    displayWord(currentIndex);
}

function togglePause() {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? "继续" : "暂停";
}

speedInput.addEventListener('change', () => {
    resetTimer();
});

document.getElementById('next').addEventListener('click', () => {
    nextWord();
});

document.getElementById('prev').addEventListener('click', () => {
    prevWord();
});

pauseBtn.addEventListener('click', () => {
    togglePause();
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') nextWord();
    if (e.key === 'ArrowLeft') prevWord();
    if (e.key === ' ') togglePause();
});

// Initial load
loadWords();
