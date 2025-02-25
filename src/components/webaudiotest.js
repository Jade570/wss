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

// chordProgression의 한 요소(문자열 또는 배열)를 받아 4개의 주파수 배열로 변환하는 함수
function getChordFrequencies(chordElement) {
  if (typeof chordElement === "string") {
    const notes = chordFrequencies[chordElement];
    if (!notes) return [0, 0, 0, 0];
    return notes.map(noteToFrequency);
  } else if (Array.isArray(chordElement)) {
    return chordElement.map((subChord, index) => {
      const notes = chordFrequencies[subChord];
      if (!notes) return 0;
      return noteToFrequency(notes[index] || notes[0]);
    });
  }
  return [0, 0, 0, 0];
}

const NativeAudioPlayerWithChordProgression = () => {
  // Ref 및 상태 선언
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const filterRefs = useRef([]); // 4개의 밴드패스 필터
  const autoMakeupGainRef = useRef(null);
  const timeoutsRef = useRef([]); // 스케줄링 타이머 ID 저장
  const measureIndexRef = useRef(0);
  const autoMakeupIntervalRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [qValue, setQValue] = useState(30); // 초기 Q값 30
  const qValueRef = useRef(qValue);

  useEffect(() => {
    qValueRef.current = qValue;
  }, [qValue]);

  const BPM = 90;
  const beatsPerMeasure = 4;
  const measureDuration = (beatsPerMeasure * 60) / BPM; // 한 마디(4박자) 지속시간(초)

  const playAudio = async () => {
    try {
      // AudioContext 생성 및 활성화
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
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
      sourceRef.current = source;

      // 4개의 밴드패스 필터 생성 (각 필터 초기 Q: qValue, 초기 frequency는 440Hz)
      const filters = [];
      for (let i = 0; i < 4; i++) {
        const filter = audioContext.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = qValue;
        filter.frequency.value = 440;
        filters.push(filter);
      }
      filterRefs.current = filters;

      // DynamicsCompressorNode 생성
      const compressor = audioContext.createDynamicsCompressor();

      // Auto-Makeup Gain 노드 생성 (초기 base gain 적용)
      const baseGain = 1 + 69 * (Math.log(qValueRef.current) / Math.log(700));
      const autoMakeupGain = audioContext.createGain();
      autoMakeupGain.gain.value = baseGain;
      autoMakeupGainRef.current = autoMakeupGain;

      // Analyser 노드 생성 (compressor 출력 RMS 측정을 위해)
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Float32Array(analyser.fftSize);

      // 오디오 체인 구성: source → 각 filter → compressor → autoMakeupGain → destination  
      // compressor의 출력은 analyser에도 연결하여 RMS 측정
      filters.forEach(filter => {
        source.connect(filter);
        filter.connect(compressor);
      });
      compressor.connect(autoMakeupGain);
      autoMakeupGain.connect(audioContext.destination);
      compressor.connect(analyser);

      // 재생 시작
      source.start(0);

      // Auto-Makeup Gain 업데이트 (100ms 간격)
      // RMS 측정을 통해 얻은 makeup factor와 Q 슬라이더 기반 baseGain을 곱해 최종 gain을 산출
      const target = 0.2; // 목표 RMS (필요에 따라 조정)
      const epsilon = 0.001;
      const updateAutoMakeup = () => {
        analyser.getFloatTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        let makeupFactor = target / (rms + epsilon);
        makeupFactor = Math.min(Math.max(makeupFactor, 1), 10); // clamp: 1~10

        // baseGain는 Q값에 따라 결정
        const baseGainNow = 1 + 6.9 * (Math.log(qValueRef.current) / Math.log(700));
        const finalGain = baseGainNow * makeupFactor;
        autoMakeupGain.gain.exponentialRampToValueAtTime(
          finalGain,
          audioContext.currentTime + 0.1
        );
        
        console.log("RMS:", rms.toFixed(3), "makeupFactor:", makeupFactor.toFixed(3), "baseGain:", baseGainNow.toFixed(3), "finalGain:", finalGain.toFixed(3));
      };

      const autoMakeupInterval = setInterval(updateAutoMakeup, 100);
      autoMakeupIntervalRef.current = autoMakeupInterval;

      // Chord Progression 스케줄링 함수 (매 마디마다 필터의 frequency와 Q 값을 업데이트)
      measureIndexRef.current = 0;
      timeoutsRef.current = [];
      const scheduleMeasure = () => {
        const progression = chordProgression.marching_new;
        if (!progression) {
          console.error("chordProgression.marching_new이 정의되어 있지 않습니다.");
          return;
        }
        const currentElement = progression[measureIndexRef.current % progression.length];

        // 매 마디마다 필터의 Q값을 최신 qValue로 재적용
        filterRefs.current.forEach(filter => {
          filter.Q.value = qValueRef.current;
        });

        if (typeof currentElement === "string") {
          // 문자열이면 한 마디 전체에 동일한 chord 적용
          const freqs = getChordFrequencies(currentElement); // 4개 주파수 배열
          filterRefs.current.forEach((filter, index) => {
            filter.frequency.setTargetAtTime(
              freqs[index],
              audioContext.currentTime,
              0.01
            );
          });
          console.log(`Bar ${measureIndexRef.current + 1}: ${currentElement}`, freqs);
          measureIndexRef.current++;
          const tId = setTimeout(scheduleMeasure, measureDuration * 1000);
          timeoutsRef.current.push(tId);
        } else if (Array.isArray(currentElement)) {
          // 배열이면 한 마디를 서브 요소 수만큼 나눔
          const subdivisions = currentElement.length;
          const subDuration = measureDuration / subdivisions;
          currentElement.forEach((subChord, idx) => {
            const tId = setTimeout(() => {
              // 서브 코드 적용 시에도 Q값 재적용
              filterRefs.current.forEach(filter => {
                filter.Q.value = qValueRef.current;
              });
              const freqs = getChordFrequencies(subChord);
              filterRefs.current.forEach((filter, index) => {
                filter.frequency.setTargetAtTime(
                  freqs[index],
                  audioContext.currentTime,
                  0.01
                );
              });
              console.log(
                `Bar ${measureIndexRef.current + 1} - Subdivision ${idx + 1}/${subdivisions}: ${subChord}`,
                freqs
              );
            }, idx * subDuration * 1000);
            timeoutsRef.current.push(tId);
          });
          measureIndexRef.current++;
          const tId = setTimeout(scheduleMeasure, measureDuration * 1000);
          timeoutsRef.current.push(tId);
        }
      };

      scheduleMeasure();
      setIsPlaying(true);
    } catch (error) {
      console.error("오디오 재생 중 오류 발생:", error);
    }
  };

  // 정지 함수: 타이머와 노드를 정리합니다.
  const stopAudio = () => {
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current = [];
    if (autoMakeupIntervalRef.current) {
      clearInterval(autoMakeupIntervalRef.current);
      autoMakeupIntervalRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      filterRefs.current.forEach(filter => filter.disconnect());
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  return (
    <div style={{ padding: "1em", background: "#e0e0e0" }}>
      <h2>Chord Progression 적용 Native Web Audio API Player</h2>
      <button onClick={playAudio} disabled={isPlaying} style={{ marginRight: "1em" }}>
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
      <p>BPM: {BPM} / 한 마디 지속시간: {measureDuration.toFixed(2)}초</p>
    </div>
  );
};

export default NativeAudioPlayerWithChordProgression;
