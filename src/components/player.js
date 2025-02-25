import React, { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import chordFrequencies from "./chordFrequencies";
import chordProgression from "./chordProgressions";

// 코드별 음 배열 (순서대로: 근음, 3음, 5음, 옥타브/7음)

// filter의 Q값에 따라 gain을 계산하는 함수
const calculateGain = (Q) => {
  return 5 * Math.log10(Q); // 예: Q = 700이면 약 70
};

const OscilloscopeWithFilterToggle = () => {
  const [filterActive, setFilterActive] = useState(true);
  const filterQ = 10;
  const computedGain = calculateGain(filterQ);

  // 재생바 관련 상태: 현재 재생 위치와 전체 길이(초)
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  // dryGain, filteredGain, player를 ref로 저장
  const dryGainRef = useRef(null);
  const filteredGainRef = useRef(null);
  const playerRef = useRef(null);

  // 플레이어의 재생 시작 시점을 기록하기 위한 ref
  // 실제 재생 위치는 (현재 Transport.seconds - seekTimeRef) + startOffsetRef 로 계산
  const seekTimeRef = useRef(0);
  const startOffsetRef = useRef(0);

  // 오디오 체인을 한 번만 생성 (컴포넌트 마운트 시)
  useEffect(() => {
    Tone.getContext().transport.bpm.value = 80;
    const masterGain = new Tone.Gain(1.0).toDestination();

    // 초기 filterActive 상태에 따른 게인 값 설정
    const dryGain = new Tone.Gain(filterActive ? 0 : 1).connect(masterGain);
    const filteredGain = new Tone.Gain(filterActive ? computedGain : 0).connect(masterGain);
    dryGainRef.current = dryGain;
    filteredGainRef.current = filteredGain;

    // 4개의 채널과 필터 체인 생성 (Tone.Channel + Filter)
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

    // Tone.Player 생성 (loop:true로 설정하여 계속 재생)
    const player = new Tone.Player({
      url: "/sample.m4a",
      autostart: false,
      loop: true,
      onload: () => {
        console.log("Player loaded.");
        // 총 재생 길이 (초) 설정
        setTotalDuration(player.buffer.duration);
        // 초기 재생 시점을 기록 (현재 Transport.seconds)
        seekTimeRef.current = Tone.Transport.seconds;
        startOffsetRef.current = 0;
        Tone.start().then(() => {
          Tone.Transport.start();
          player.start();
        });
      },
    });
    playerRef.current = player;

    // 플레이어의 출력 신호를 dryGain과 각 채널(필터 체인)에 병렬 연결
    player.connect(dryGain);
    channels.forEach((channel) => {
      player.connect(channel);
    });

    // Tone.Sequence로 코드 진행에 따라 필터의 주파수를 업데이트
    // const chordProgression = ["Am", "Am", "Am", "E7",
    //   "Dm", "Am", "E7", "Am",
    //   "Am", "Am", "Am", "E7",
    //   "Dm", "Am", "E7", "Am",
    //   "F", "Am", "C", "E7",
    //   "F", "Am", "C", "G",
    //   "Am", "Dm", "Am", "E7",
    //   "Am", "Am", "E7", "Am"];

    // const newProgression = [
    //   "Cm", "Cm", ["Cm", "Cm", "Cm", "Ddim7"], ["Eb", "CtoE"],
    //   "Fm", "Cm", "G", "Cm",
    //   "Cm", "Cm", ["Cm", "Cm", "Cm", "Ddim7"], ["Eb", "CtoE"],
    //   "Fm", "Cm", "G", "Cm",
    //   "Fm", "Cm", "Bb", ["Eb", "CtoE"],
    //   "Fm", "Cm", "Dhalfdim7", ["Csus4", "G"],
    //   "Cm", "Fm", "Eb", "G",
    //   "Cm", "Eb", "G", "Cm"
    // ];
    const seq = new Tone.Sequence(
      (time, chord) => {
        // chord가 배열일 수도 있으므로 처리
        const chords = Array.isArray(chord) ? chord : [chord];
        chords.forEach((note, i) => {
          if (chordFrequencies[note]) {
            const freq = Tone.Frequency(chordFrequencies[note][i]).toFrequency();
            filters[i].frequency.setValueAtTime(freq, time);
          }
        });
      },
      chordProgression.marching_new,
      "1n" // 1 온음표마다 업데이트
    );
    seq.start(0);

    // 컴포넌트 언마운트 시 Tone 노드 정리
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
  }, []); // 마운트 시 한 번 실행

  // filterActive 상태 변화 시 게인 값만 업데이트
  useEffect(() => {
    if (dryGainRef.current && filteredGainRef.current) {
      dryGainRef.current.gain.value = filterActive ? 0 : 1;
      filteredGainRef.current.gain.value = filterActive ? computedGain : 0;
    }
  }, [filterActive, computedGain]);

  // 재생 위치 업데이트: requestAnimationFrame으로 주기적으로 Tone.Transport.seconds를 기준으로 계산
  useEffect(() => {
    let rafId;
    const updatePosition = () => {
      if (playerRef.current && totalDuration > 0) {
        const elapsed = Tone.Transport.seconds - seekTimeRef.current;
        // 현재 재생 위치는 (시작 오프셋 + 경과시간)를 총 길이로 나눈 나머지
        const pos = (startOffsetRef.current + elapsed) % totalDuration;
        setPlaybackPosition(pos);
      }
      rafId = requestAnimationFrame(updatePosition);
    };
    updatePosition();
    return () => cancelAnimationFrame(rafId);
  }, [totalDuration]);

  // 재생바 변경 시 호출: 사용자가 원하는 위치로 이동
  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (playerRef.current) {
      playerRef.current.seek(newTime);
      // 재생 위치 계산을 위한 기준값 업데이트
      seekTimeRef.current = Tone.Transport.seconds;
      startOffsetRef.current = newTime;
      setPlaybackPosition(newTime);
    }
  };

  return (
    <div>
      <button onClick={() => setFilterActive((prev) => !prev)}>
        {filterActive ? "필터 끄기 (바이패스)" : "필터 켜기"}
      </button>
      <div style={{ marginTop: "20px" }}>
        {/* 재생바 */}
        <input
          type="range"
          min="0"
          max={totalDuration}
          step="0.01"
          value={playbackPosition}
          onChange={handleSeek}
          style={{ width: "100%" }}
        />
        <div>
          {playbackPosition.toFixed(2)} / {totalDuration.toFixed(2)} 초
        </div>
      </div>
    </div>
  );
};

export default OscilloscopeWithFilterToggle;
