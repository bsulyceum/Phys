{
  "config": {
    "siteTitle": "Физика 11: Оптика (Лицей БГУ)"
  },
  "modes": {
    "study": {
      "name": "Изучение",
      "description": "Режим без времени. Разбирайся в теории.",
      "lives": 0, "timePerQuestion": 0, "totalTime": 0,
      "endMessage": "Тема изучена!"
    },
    "train": {
      "name": "Тренировка",
      "description": "На вопрос {timePerQuestion} сек. Ошибки разрешены.",
      "lives": 5, "timePerQuestion": 15, "totalTime": 0,
      "endMessage": "Хороший результат!"
    },
    "exam": {
      "name": "Зачет (8+)",
      "description": "Всего {totalTime/60} мин. На вопрос {timePerQuestion} сек. Всего {lives} жизней.",
      "lives": 2, "timePerQuestion": 15, "totalTime": 60,
      "endMessage": "Зачет сдан! Ты настоящий лицеист."
    }
  },
  "topics": [
    { 
      "id": "huygens", 
      "name": "Принцип Гюйгенса-Френеля",
      "distractorsCount": 2 
    },
    { 
      "id": "interference", 
      "name": "Интерференция света",
      "distractorsCount": 2 
    },
    { 
      "id": "diffraction", 
      "name": "Дифракция света",
      "distractorsCount": 2 
    },
    { 
      "id": "final_test", 
      "name": "ИТОГОВЫЙ ТЕСТ", 
      "includeTopics": ["huygens", "interference", "diffraction"],
      "limitQuestions": 5,
      "distractorsCount": 2
    }
  ],
  "questions": [
    {
      "topicId": "huygens", "mode": "all",
      "text": "Согласно Гюйгенсу, каждая точка среды, до которой дошло возмущение, становится:",
      "options": [
        "Источником вторичных сферических волн", 
        "Точкой полного поглощения энергии", 
        "Центром гравитационного притяжения", 
        "Точкой, где свет меняет частоту", 
        "Отражающим зеркалом для лучей", 
        "Источником только продольных волн"
      ],
      "correct": 0,
      "explanation": "Это база принципа Гюйгенса: каждая точка фронта — новый источник волн."
    },