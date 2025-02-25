// // varyings: fragment shader로 전달할 값들
// varying vec2 vUv;      // UV 좌표를 전달
// varying vec3 vNormal;  // 변환된 법선 벡터를 전달

// void main() {
//   // 내장 attribute 'uv'를 vUv로 전달 (텍스처 좌표)
//   vUv = uv;
  
//   // 내장 attribute 'normal'을 normalMatrix를 통해 변환한 후 정규화하고 vNormal에 저장
//   vNormal = normalize(normalMatrix * normal);
  
//   // 내장 attribute 'position'을 modelViewMatrix와 projectionMatrix를 사용해 클립 공간으로 변환하여 gl_Position에 할당
//   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
// }


varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  // 월드 좌표 계산: 모델 행렬(modelMatrix)을 적용
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
