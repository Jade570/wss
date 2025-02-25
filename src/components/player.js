import React, { useEffect, useRef, useState } from "react";
import * as Tone from "tone";

// 코드별 음 배열 (순서대로: 근음, 3음, 5음, 옥타브/7음)
const chordFrequencies = {
  Am: ["A2", "C3", "E3", "A3"],
  E7: ["E3", "G#3", "B3", "D4"],
  Dm: ["D3", "F3", "A3", "D4"],
  F: ["C3","F3","A3","C4"],
  C: ["C3", "E3", "G3", "C4"],
  G: ["D3","G3","B3","D4"],
  Cm: ["C3", "Eb3", "G3", "C4"],
  Ddim7:["D3", "F3", "Ab3", "B3"],
  Dhalfdim7:["D3", "F3", "Ab3", "C4"],
  Csus4:["C3", "F3", "G3", "C4"],
  Eb:["Eb3", "G3", "Bb3", "Eb4"],
  Bb:["Bb2", "D3", "F3", "Bb3"],
  CtoE:["E3", "G3", "C4", "E4"],
  Fm: ["C3","F3","Ab3","C4"],
};

const calculateGain = (Q) => {
  return 5 * Math.log10(Q);  // 기본적으로 Q = 700일 때 70이 되도록 설정
};

const OscilloscopeWithFilterToggle = () => {
  const [filterActive, setFilterActive] = useState(true);
  const filterQ = 10;
  const computedGain = calculateGain(filterQ);
  

  //bpm change
  Tone.getContext().transport.bpm.value = 80; 
  useEffect(() => {
    // === Tone 노드 생성 ===
    // 최종 출력 노드: masterGain에 analyser를 연결하여 오실로스코프에 신호를 보냅니다.
    const masterGain = new Tone.Gain(1.0);
    masterGain.toDestination();

    // dry/filtered 경로를 위한 게인 노드 생성
    // filterActive가 true이면 filteredGain 1, dryGain 0; false이면 그 반대로.
    const dryGain = new Tone.Gain(filterActive ? 0 : 1).connect(masterGain);
    const filteredGain = new Tone.Gain(filterActive ? computedGain : 0).connect(masterGain);

    // --- Tone.Channel + Filter 체인 ---
    // 4개의 채널에 하나씩 필터를 생성 (초기 frequency는 0으로 설정 → sequence에서 업데이트)
    const filterNum = 4;
    const channels = [];
    const filters = [];
    for (let i = 0; i < filterNum; i++) {
      const channel = new Tone.Channel();
      const filter = new Tone.Filter({
        Q: filterQ,
        type: "bandpass",
      });
      channel.connect(filter);
      filter.connect(filteredGain);
      channels.push(channel);
      filters.push(filter);
    }

    // sample.m4a 파일을 재생할 Tone.Player 생성 (onload 옵션 사용)
    const player = new Tone.Player({
      url: "/sample.m4a",
      autostart: false,
      loop: false,
      onload: () => {
        console.log("Player loaded.");
        Tone.start().then(() => {
          // Tone.Transport를 시작해야 Tone.Sequence가 작동합니다.
          Tone.Transport.start();
          player.start();
        });
      },
    });

    // 플레이어의 출력 신호를 두 경로에 병렬로 연결합니다.
    // dry 경로: player → dryGain (바이패스)
    // filtered 경로: player → 각 Tone.Channel → Filter 체인 → filteredGain
    player.connect(dryGain);
    channels.forEach((channel) => {
      player.connect(channel);
    });

    // === Tone.Sequence로 코드 진행에 따른 필터 업데이트 ===
    const chordProgression = ["Am", "Am", "Am", "E7",
                             "Dm", "Am", "E7", "Am",
                             "Am", "Am", "Am", "E7",
                             "Dm", "Am", "E7", "Am",
                             "F", "Am", "C", "E7",
                             "F", "Am", "C", "G",
                             "Am", "Dm", "Am", "E7",
                             "Am", "Am", "E7", "Am"];
    const newProgression = [ "Cm", "Cm", ["Cm","Cm","Cm","Ddim7"], ["Eb", "CtoE"],
                             "Fm", "Cm", "G", "Cm",
                             "Cm", "Cm", ["Cm","Cm","Cm","Ddim7"], ["Eb", "CtoE"],
                             "Fm", "Cm", "G", "Cm",
                             "Fm", "Cm", "Bb", ["Eb", "CtoE"],
                             "Fm", "Cm", "Dhalfdim7", ["Csus4", "G"],
                             "Cm", "Fm", "Eb", "G",
                             "Cm", "Eb", "G", "Cm"];
    const seq = new Tone.Sequence(
      (time, chord) => {
        // chordFrequencies[chord]는 배열로, 각 필터에 순서대로 적용
        chordFrequencies[chord].forEach((note, i) => {
          // 필터의 frequency를 해당 음의 주파수로 업데이트
          const freq = Tone.Frequency(note).toFrequency();
          filters[i].frequency.setValueAtTime(freq, time);
        });
      }, 
      newProgression,
      "1n" // 1n(온음표)마다 업데이트
    );
    seq.start(0);

    // 상태 변경 시 dryGain와 filteredGain의 값 업데이트 (실시간 조절)
    dryGain.gain.value = filterActive ? 0 : 1;
    filteredGain.gain.value = filterActive ? computedGain : 0;
    console.log(computedGain);
    // === 컴포넌트 언마운트 시 정리 ===
    return () => {
      Tone.Transport.stop();
      player.stop();
      player.dispose();
      seq.dispose();
      channels.forEach((ch) => ch.dispose());
      filters.forEach((f) => f.dispose());
      dryGain.dispose();
      filteredGain.dispose();
      masterGain.dispose();
    };

    
  }, [filterActive]);

  return (
    <div>
      <div>
        <button onClick={() => setFilterActive((prev) => !prev)}>
          {filterActive ? "필터 끄기 (바이패스)" : "필터 켜기"}
        </button>
        </div>
    </div>
  );
};

export default OscilloscopeWithFilterToggle;
