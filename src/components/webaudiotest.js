import React, { useRef, useState, useEffect } from "react";
import chordFrequencies from "./chordFrequencies";
import chordProgression from "./chordProgressions";

// 노트 이름("A4", "Eb3" 등)을 Hz로 변환하는 함수
function noteToFrequency(note) {
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

// chordProgression의 한 요소(문자열 또는 배열)를 받아 4개의 frequency 배열로 변환하는 함수
// 문자열인 경우 chordFrequencies에서 4개의 음을 읽고, 배열인 경우 해당 서브 요소에 맞게 처리합니다.
function getChordFrequencies(chordElement) {
  if (typeof chordElement === "string") {
    const notes = chordFrequencies[chordElement];
    if (!notes) return [0, 0, 0, 0];
    return notes.map(noteToFrequency);
  } else if (Array.isArray(chordElement)) {
    // 배열인 경우, 각 요소가 chordProgression의 서브 코드라고 가정하고 각 서브 코드의 4음 중 하나씩 사용
    // 여기서는 서브 배열의 각 요소를 문자열로 보고, chordFrequencies에서 해당 코드의 첫 4음 중 index에 해당하는 음을 사용합니다.
    return chordElement.map((subChord, index) => {
      const notes = chordFrequencies[subChord];
      if (!notes) return 0;
      // 만약 해당 코드의 음이 4개 미만이면 첫 음으로 대체합니다.
      return noteToFrequency(notes[index] || notes[0]);
    });
  }
  return [0, 0, 0, 0];
}

const NativeAudioPlayerWithChordProgression = () => {
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const filterRefs = useRef([]); // 4개의 밴드패스 필터
  const timeoutsRef = useRef([]); // 재생 스케줄링에 사용한 타이머 id들을 저장
  const measureIndexRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [qValue, setQValue] = useState(30); // 초기 Q값 30, 파일 상단 다른 상태 변수와 함께 선언
  const gainNodeRef = useRef(null);

  const BPM = 90;
  const beatsPerMeasure = 4;
  const measureDuration = (beatsPerMeasure * 60) / BPM; // 한 마디(4박자) 지속시간 (초)

  // 재생 스케줄링 함수 (재귀적으로 호출)
  const scheduleMeasure = () => {
    const progression = chordProgression.marching_new;
    const currentElement =
      progression[measureIndexRef.current % progression.length];

    if (typeof currentElement === "string") {
      // 한 마디 전체에 적용
      const freqs = getChordFrequencies(currentElement);
      filterRefs.current.forEach((filter, index) => {
        filter.frequency.setTargetAtTime(
          freqs[index],
          audioContextRef.current.currentTime,
          0.01
        );
      });
      console.log(
        `Bar ${measureIndexRef.current + 1}: ${currentElement}`,
        freqs
      );
      // 다음 마디 스케줄링
      measureIndexRef.current++;
      const tId = setTimeout(scheduleMeasure, measureDuration * 1000);
      timeoutsRef.current.push(tId);
    } else if (Array.isArray(currentElement)) {
      // 배열인 경우, 한 마디를 서브 코드 수만큼 나눔
      const subdivisions = currentElement.length;
      const subDuration = measureDuration / subdivisions;
      currentElement.forEach((subChord, idx) => {
        const tId = setTimeout(() => {
          const freqs = getChordFrequencies(subChord);
          filterRefs.current.forEach((filter, index) => {
            filter.frequency.setTargetAtTime(
              freqs[index],
              audioContextRef.current.currentTime,
              0.01
            );
          });
          console.log(
            `Bar ${measureIndexRef.current + 1} - Subdivision ${
              idx + 1
            }/${subdivisions}: ${subChord}`,
            freqs
          );
        }, idx * subDuration * 1000);
        timeoutsRef.current.push(tId);
      });
      // 다음 마디 스케줄링 후 전체 마디 시간 경과
      measureIndexRef.current++;
      const tId = setTimeout(scheduleMeasure, measureDuration * 1000);
      timeoutsRef.current.push(tId);
    }
  };

  // 오디오 재생 및 체인 구성 함수
  const playAudio = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          window.webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // /sample.m4a 파일 불러오기 및 디코딩
      const response = await fetch("/sample.m4a");
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // AudioBufferSourceNode 생성 (루프 재생)
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;

      // 4개의 밴드패스 필터 생성 (초기 Q: 30, frequency는 이후 스케줄링에서 업데이트)
      const filters = [];
      for (let i = 0; i < 4; i++) {
        const filter = audioContext.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = 30;
        filters.push(filter);
      }
      filterRefs.current = filters;

      // gainNode 생성 (Q값에 따라 gain 조절)
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1 + 69 * (Math.log(qValue) / Math.log(700));
      gainNodeRef.current = gainNode;

      // source를 4개의 필터에 각각 연결하고, 각 필터의 출력은 gainNode로 연결 후 destination에 연결
      filters.forEach((filter) => {
        source.connect(filter);
        filter.connect(gainNode);
      });
      gainNode.connect(audioContext.destination);

      source.start(0);
      sourceRef.current = source;
      setIsPlaying(true);
      measureIndexRef.current = 0;
      // 기존 타이머 제거 (혹시 남아있다면)
      timeoutsRef.current.forEach((id) => clearTimeout(id));
      timeoutsRef.current = [];
      // 재생 스케줄링 시작
      scheduleMeasure();
    } catch (error) {
      console.error("오디오 재생 중 오류 발생:", error);
    }
  };

  // 오디오 정지 및 자원 정리 함수
  const stopAudio = () => {
    // 모든 타이머 취소
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];

    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      filterRefs.current.forEach((filter) => filter.disconnect());
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  useEffect(() => {

      

    if (filterRefs.current && filterRefs.current.length > 0) {
      filterRefs.current.forEach(filter => {
        filter.Q.value = qValue;
      });
    }
    if (gainNodeRef.current && audioContextRef.current) {
        const newGain = 1 + 69 * (Math.log(qValue) / Math.log(700));
        // 0.1초 동안 부드럽게 전환 (필요에 따라 timeConstant 조절)
        gainNodeRef.current.gain.exponentialRampToValueAtTime(newGain, audioContextRef.current.currentTime + 0.1);
      }
  }, [qValue]);
  

  return (
    <div style={{ padding: "1em", background: "#e0e0e0" }}>
      <h2>Chord Progression 적용 Native Web Audio API Player</h2>
      <button
        onClick={playAudio}
        disabled={isPlaying}
        style={{ marginRight: "1em" }}
      >
        재생
      </button>
      <button onClick={stopAudio} disabled={!isPlaying}>
        정지
      </button>
      <label style={{ display: "block", marginTop: "1em" }}>
        Q 값: {qValue}
        <input
          type="range"
          min="1"
          max="700"
          step="1"
          value={qValue}
          onChange={(e) => setQValue(parseInt(e.target.value, 10))}
          style={{ width: "100%" }}
        />
      </label>

      <p>
        BPM: {BPM} / 한 마디 지속시간: {measureDuration.toFixed(2)}초
      </p>
    </div>
  );
};

export default NativeAudioPlayerWithChordProgression;
