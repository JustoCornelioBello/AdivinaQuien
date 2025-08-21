// src/games/data.js
// 7 juegos, 25 niveles cada uno (placeholders funcionales)

export const GAMES = [
  {
    id: "memoria",
    title: "Juego de Memoria",
    description: "Encuentra las parejas. Cada nivel aumenta la dificultad (más cartas).",
    type: "memory",
  },
  {
    id: "adivina",
    title: "Adivina Quién",
    description: "3 pistas. Escribe la respuesta exacta para acertar.",
    type: "qa",
  },
  {
    id: "ahorcado",
    title: "El Ahorcado",
    description: "Adivina la palabra letra por letra. ¡No agotes tus vidas!",
    type: "hangman",
  },
  {
    id: "quiz",
    title: "Quiz General",
    description: "Conocimiento general con 3 pistas por pregunta.",
    type: "qa",
  },
  {
    id: "banderas",
    title: "Banderas del Mundo",
    description: "Adivina el país por su pista. Dificultad creciente.",
    type: "qa",
  },
  {
    id: "anagramas",
    title: "Anagramas",
    description: "Reordena letras para formar la palabra correcta.",
    type: "qa",
  },
  {
    id: "secuencias",
    title: "Secuencias",
    description: "Completa la secuencia lógica. 3 pistas si lo necesitas.",
    type: "qa",
  },
];

// Genera 25 niveles simples por juego.
// Para QA: {answer, hints:[...]} ; Para hangman: {word, hints}; Para memory: {pairs}
export function buildLevels(gameId) {
  const arr = [];
  for (let i = 1; i <= 25; i++) {
    if (gameId === "memoria") {
      // pares = 4, 6, 8... creciendo
      const pairs = Math.min(2 + Math.floor(i / 2), 12);
      arr.push({ pairs, level: i });
    } else if (gameId === "ahorcado") {
      const word = AHORCADO_WORDS[(i - 1) % AHORCADO_WORDS.length];
      arr.push({ word, hints: [`Empieza con ${word[0]}`, `Letras: ${word.length}`, "Común en vocabulario"], level: i });
    } else {
      const bank = QA_BANKS[gameId] || QA_BANKS["quiz"];
      const item = bank[(i - 1) % bank.length];
      arr.push({ answer: item.answer, hints: item.hints, level: i });
    }
  }
  return arr;
}

// ====== Bancos demo ======
const AHORCADO_WORDS = [
  "react", "memoria", "animal", "diamante", "ganar", "puzzle", "nivel", "logro", "cofre", "moneda"
];

const QA_BANKS = {
  adivina: [
    { answer: "albert einstein", hints: ["Físico", "Teoría de la relatividad", "Premio Nobel 1921"] },
    { answer: "leonardo da vinci", hints: ["Renacimiento", "Mona Lisa", "Inventor y artista"] },
    { answer: "shakira", hints: ["Colombia", "Cantante", "Hips don't lie"] },
  ],
  quiz: [
    { answer: "paris", hints: ["Europa", "Torre famosa", "Francia"] },
    { answer: "amazonas", hints: ["Río", "Sudamérica", "Selva" ] },
    { answer: "everest", hints: ["Montaña", "Más alta", "Himalaya"] },
  ],
  banderas: [
    { answer: "japon", hints: ["Asia", "Círculo rojo", "Sol naciente"] },
    { answer: "brasil", hints: ["Sudamérica", "Verde/amarillo", "Fútbol"] },
    { answer: "canada", hints: ["Norteamérica", "Hoja", "Rojo y blanco"] },
  ],
  anagramas: [
    { answer: "raton", hints: ["Animal pequeño", "Tecnología", "Se mueve"], },
    { answer: "teclado", hints: ["Periférico", "Escritura", "QWERTY"] },
    { answer: "pantalla", hints: ["Visual", "Monitor", "Móvil/PC"] },
  ],
  secuencias: [
    { answer: "8", hints: ["2,4,6,?", "Pares", "Suma 2"] },
    { answer: "21", hints: ["1,1,2,3,5,8,13,?", "Fibonacci", "Suma dos anteriores"] },
    { answer: "d", hints: ["a,b,c,?", "Alfabeto", "Siguiente letra"] },
  ],
};
