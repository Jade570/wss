import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

const FileFilterTest = () => {
  const [qValue, setQValue] = useState(10); // 초기 Q값 10
  const [isPlaying, setIsPlaying] = useState(false);

  // 노드들을 ref로 저장
  const playerRef = useRef(null);
  const filterRef = useRef(null);
  const outputRef = useRef(null);

  useEffect(() => {
    // 출력용 게인 노드를 생성하여 Destination에 연결
    // const output = new Tone.Gain(1).toDestination();
    // outputRef.current = output;

    // 파일 플레이어 생성 (루프 재생)
    const player = new Tone.Player({
      url: "/sample.m4a", // 재생할 파일 경로
      autostart: false,
      loop: true,
    });
    playerRef.current = player;
    // // 초기 필터 생성 (bandpass, 중심 주파수 1000Hz)
    const filter = new Tone.Filter({
      frequency: 1000,
      Q: qValue,
      type: "bandpass",
    }).toDestination();
    filterRef.current = filter;

    // 체인 구성: Player -> Filter -> Output
    player.connect(filter);
    // filter.connect(output);
    // player.toDestination();
    // filter.toDestination();
    return () => {
      player.dispose();
      filter.dispose();
      output.dispose();
    };
  }, []); // 마운트 시 한 번 실행

//   // qValue가 변경되면 필터를 교체하는 resetFilter 호출
//   useEffect(() => {

//     resetFilter(qValue);

//     console.log(filterRef.current);

//   }, [qValue]);

  const togglePlayback = async () => {
    if (isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
    } else {
      await Tone.start(); // 사용자 액션에서 AudioContext 활성화
      playerRef.current.start();
      setIsPlaying(true);
    }
  };

  // 기존 필터를 새 Q 값으로 교체하는 함수
  const resetFilter = (newQ) => {
    const player = playerRef.current;
    const oldFilter = filterRef.current;
    const output = outputRef.current;

    // 새 필터 생성 (기존 중심 주파수 유지)
    const newFilter = new Tone.Filter({
      frequency: oldFilter.frequency.value,
      Q: newQ,
      type: "bandpass",
    });
    // 새 필터를 출력에 연결
    newFilter.connect(output);

    // 기존 필터와의 연결 끊기: player에서 oldFilter를 제거한 후 새 필터에 연결
    player.disconnect(oldFilter);
    player.connect(newFilter);

    // 새 필터로 업데이트 후 기존 필터 폐기
    filterRef.current = newFilter;
    oldFilter.dispose();
  };

  return (
    <div style={{ color: "#ffffff", background: "#333", padding: "1em" }}>
      <h2>File Filter Test</h2>
      <button onClick={togglePlayback} style={{ margin: "0.5em" }}>
        {isPlaying ? "정지" : "재생"}
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
      <p>슬라이더로 필터의 Q 값을 변경하면, 기존 필터를 새 필터로 교체하여 적용합니다.</p>
    </div>
  );
};

export default FileFilterTest;
