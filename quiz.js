let quizData = null;
let state = {
    mode: null, 
    topic: null, 
    questions: [], 
    currentIdx: 0,
    score: 0, 
    lives: 0, 
    totalTimeLeft: 0, 
    qTimer: 0,
    isPaused: true, 
    selectedIndices: [], 
    timerInterval: null,
    totalTimeElapsed: 0
};

async function init() {
    const res = await fetch('quiz.json');
    quizData = await res.json();
    document.getElementById('site-title').innerText = quizData.config.siteTitle;

    const modeWrap = document.getElementById('mode-selector');
    Object.entries(quizData.modes).forEach(([id, m], idx) => {
        const btn = document.createElement('button');
        btn.innerText = m.name;
        btn.className = 'mode-btn';
        btn.dataset.id = id; // Сохраняем id в кнопку
        btn.onclick = () => selectMode(id, btn);
        modeWrap.appendChild(btn);
        if(idx === 0) selectMode(id, btn); 
    });

    const select = document.getElementById('topic-select');
    quizData.topics.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id; opt.innerText = t.name;
        select.appendChild(opt);
    });
}

function selectMode(id, btn) {
    state.mode = id;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const cfg = quizData.modes[id]; // Обращаемся по ключу
    let desc = cfg.description
        .replace('{lives}', cfg.lives || '∞')
        .replace('{timePerQuestion}', cfg.timePerQuestion || '0')
        .replace('{totalTime/60}', (cfg.totalTime / 60) || '0')
        .replace('{topicsCount}', quizData.topics.length);
    document.getElementById('mode-desc-text').innerText = desc;
}

function startCountdown() {
    showScreen('screen-countdown');
    let count = 3;
    const el = document.getElementById('countdown-number');
    el.innerText = count;
    const interval = setInterval(() => {
        count--;
        if (count <= 0) { clearInterval(interval); startQuiz(); }
        else el.innerText = count;
    }, 500);
}

function startQuiz() {
    const cfg = quizData.modes[state.mode];
    const topicId = document.getElementById('topic-select').value;
    const topicCfg = quizData.topics.find(t => t.id === topicId);
    
    // 1. Собираем список тем (одна или несколько)
    const topicsToInclude = topicCfg.includeTopics || [topicId];
    
    // 2. Фильтруем все вопросы, входящие в эти темы
    let allPool = quizData.questions.filter(q => 
        topicsToInclude.includes(q.topicId) && (q.mode === state.mode || q.mode === 'all')
    );
    
    // 3. Перемешиваем и ограничиваем количество вопросов (если задано)
    allPool.sort(() => Math.random() - 0.5);
    if (topicCfg.limitQuestions) {
        allPool = allPool.slice(0, topicCfg.limitQuestions);
    }
    
    state.questions = allPool;
    state.currentIdx = 0; 
    state.score = 0;
    state.lives = cfg.lives;
    state.totalTimeLeft = cfg.totalTime;
    state.totalTimeElapsed = 0;
    state.isPaused = false;
    
    if (state.questions.length === 0) return showScreen('screen-menu');
    
    showScreen('screen-quiz');
    runTimerLogic();
    showQuestion();
}

function runTimerLogic() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        if (state.isPaused) return;

        const cfg = quizData.modes[state.mode];
        state.totalTimeElapsed++;

        if (cfg.totalTime > 0) {
            state.totalTimeLeft--;
            if (state.totalTimeLeft <= 0) endGame("Общее время вышло!");
        }

        if (cfg.timePerQuestion > 0) {
            state.qTimer--;
            if (state.qTimer <= 0) {
                if (cfg.lives > 0) state.lives--;
                if (state.lives <= 0 && cfg.lives > 0) endGame("Время вышло!");
                else nextQuestion();
            }
        }
        updateHUD();
    }, 1000);
}


async function showQuestion() {
    const q = state.questions[state.currentIdx];
    const cfg = quizData.modes[state.mode];
    const topicCfg = quizData.topics.find(t => t.id === document.getElementById('topic-select').value);
    
    state.qTimer = cfg.timePerQuestion;
    state.isPaused = true; 

    // СБРОС ИНТЕРФЕЙСА ПЕРЕД НОВЫМ ВОПРОСОМ
    document.getElementById('feedback').classList.add('hidden'); // Прячем подсказку и кнопку "Дальше"
    document.getElementById('confirm-btn').classList.add('hidden'); // Прячем кнопку "Ответить"
    const container = document.getElementById('options-container');
    container.innerHTML = ''; // Очищаем старые кнопки

    
    // Загрузка картинки (оставляем твою логику с await)
    const imgEl = document.getElementById('question-img');
    const overlay = document.getElementById('loading-overlay');
    const imgCont = document.getElementById('img-container');
    if (q.image) {
        overlay.classList.remove('hidden');
        await new Promise(r => { imgEl.onload = r; imgEl.onerror = r; imgEl.src = q.image; });
        imgCont.classList.remove('hidden');
        overlay.classList.add('hidden');
    } else {
        imgCont.classList.add('hidden');
    }

    state.isPaused = false;

    // --- ЛОГИКА ОПЦИЙ (МИКСОВАНИЕ И ДИСТРАКТОРЫ) ---
    
    // Создаем объекты для ответов, чтобы не потерять "правильность" после перемешивания
    let allOptions = q.options.map((text, index) => {
        const isCorrect = Array.isArray(q.correct) ? q.correct.includes(index) : q.correct === index;
        return { text, isCorrect };
    });

    // Если в теме задано distractorsCount, фильтруем лишние неправильные
    if (topicCfg.distractorsCount) {
        const correctOnes = allOptions.filter(o => o.isCorrect);
        let wrongOnes = allOptions.filter(o => !o.isCorrect);
        
        // Перемешиваем неправильные и берем N штук
        wrongOnes.sort(() => Math.random() - 0.5);
        wrongOnes = wrongOnes.slice(0, topicCfg.distractorsCount);
        
        // Склеиваем обратно
        allOptions = [...correctOnes, ...wrongOnes];
    }

    // Финальное перемешивание всех оставшихся опций
    allOptions.sort(() => Math.random() - 0.5);

    // Отрисовка
    document.getElementById('question-text').innerText = q.text;
    container.innerHTML = '';
    
    const isMulti = allOptions.filter(o => o.isCorrect).length > 1;
    state.selectedIndices = []; // тут будем хранить объекты опций

    allOptions.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.innerText = opt.text;
        btn.className = 'option-btn';
        btn.onclick = () => {
            if (isMulti) {
                // Логика мультивыбора
                btn.classList.toggle('selected');
                opt.userSelected = !opt.userSelected;
                document.getElementById('confirm-btn').classList.remove('hidden');
            } else {
                revealResultNew(opt, allOptions);
            }
        };
        container.appendChild(btn);
    });
    
    // Сохраняем текущие опции в стейт для проверки в мультивыборе
    state.currentQuestionOptions = allOptions;

    updateHUD();
}


function toggleSelect(idx, btn) {
    if (state.selectedIndices.includes(idx)) {
        state.selectedIndices = state.selectedIndices.filter(i => i !== idx);
        btn.classList.remove('selected');
    } else {
        state.selectedIndices.push(idx);
        btn.classList.add('selected');
    }
    document.getElementById('confirm-btn').classList.toggle('hidden', state.selectedIndices.length === 0);
}

function confirmMultiChoice() {
    revealResultNew(null, state.currentQuestionOptions);
}

function revealResultNew(clickedOpt, allOptions) {
    state.isPaused = true;
    const cfg = quizData.modes[state.mode];
    const btns = document.querySelectorAll('.option-btn');

    let isCorrect = false;

    // Проверка для сингл-выбора
    if (clickedOpt) {
        isCorrect = clickedOpt.isCorrect;
    } 
    // Проверка для мульти-выбора
    else {
        const correctCount = allOptions.filter(o => o.isCorrect).length;
        const correctSelected = allOptions.filter(o => o.isCorrect && o.userSelected).length;
        const wrongSelected = allOptions.filter(o => !o.isCorrect && o.userSelected).length;
        isCorrect = (correctCount === correctSelected && wrongSelected === 0);
    }

    // Подсветка всех кнопок
    allOptions.forEach((opt, i) => {
        btns[i].disabled = true;
        if (opt.isCorrect) btns[i].classList.add('correct');
        if (opt.userSelected && !opt.isCorrect) btns[i].classList.add('wrong');
        if (!isCorrect && !opt.userSelected && opt === clickedOpt) btns[i].classList.add('wrong');
    });

    if (isCorrect) state.score++;
    else if (cfg.lives > 0) {
        state.lives--;
        if (state.lives <= 0) return endGame("Поражение!");
    }

    document.getElementById('confirm-btn').classList.add('hidden');
    document.getElementById('feedback').classList.remove('hidden');
    document.getElementById('feedback-text').innerText = state.questions[state.currentIdx].explanation;
    updateHUD();
}

function updateHUD() {
    const cfg = quizData.modes[state.mode];
    document.getElementById('hud-lives').innerText = cfg.lives > 0 ? `❤ ${state.lives}` : "";
    
    const qWrap = document.getElementById('timer-question-wrap');
    const tWrap = document.getElementById('timer-total-wrap');

    if (cfg.timePerQuestion > 0) {
        qWrap.classList.remove('hidden');
        document.getElementById('timer-question').innerText = state.qTimer;
    } else qWrap.classList.add('hidden');

    if (cfg.totalTime > 0) {
        tWrap.classList.remove('hidden');
        document.getElementById('timer-total').innerText = state.totalTimeLeft;
    } else tWrap.classList.add('hidden');
}

function nextQuestion() {
    state.currentIdx++;
    if (state.currentIdx < state.questions.length) showQuestion();
    else endGame(quizData.modes[state.mode].endMessage);
}


function endGame(msg) {
    clearInterval(state.timerInterval);
    document.getElementById('result-message').innerText = msg;
    document.getElementById('res-score').innerText = `${state.score} из ${state.questions.length}`;
    document.getElementById('res-time').innerText = state.totalTimeElapsed;
    showScreen('screen-result');
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

init();