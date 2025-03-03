// 노트 이름("A4", "Eb3" 등)을 Hz로 변환하는 함수
const noteToFrequency = (note) => {
    const noteRegex = /^([A-G])([b#]?)(\d+)$/;
    const match = note.match(noteRegex);
    if (!match) {
      console.error("유효하지 않은 노트 형식:", note);
      return 0;
    }
    const [, noteLetter, accidental, octaveStr] = match;
    const octave = parseInt(octaveStr, 10);
    const noteMap = {
      C: 0,
      "C#": 1,
      Db: 1,
      D: 2,
      "D#": 3,
      Eb: 3,
      E: 4,
      F: 5,
      "F#": 6,
      Gb: 6,
      G: 7,
      "G#": 8,
      Ab: 8,
      A: 9,
      "A#": 10,
      Bb: 10,
      B: 11,
    };
    const key = noteLetter + accidental;
    const semitone = noteMap[key];
    if (semitone === undefined) {
      console.error("알 수 없는 노트:", note);
      return 0;
    }
    const midiNumber = (octave + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midiNumber - 69) / 12);
  }


  export default noteToFrequency;