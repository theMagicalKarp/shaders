precision mediump float;

uniform float uSeconds;
uniform vec2 resolution;
uniform vec3 uMouse;

#define TAU 6.283185
#define PI 3.141592
#define MAX_RAY_STEPS 80
#define MAX_DISTANCE 400.0
#define SURF_DIST 0.01
#define REFLECTION_BOUNCES 3

const float MAT_0 = 0.0;
const float MAT_1 = 1.0;
const float MAT_2 = 2.0;
const float MAT_3 = 3.0;
const float MAT_4 = 4.0;
const float MAT_5 = 5.0;
const float MAT_6 = 6.0;

// https://iquilezles.org/articles/distfunctions/
float sdCutHollowSphere( vec3 p, float r, float h, float t ) {
  // sampling independent computations (only depend on shape)
  float w = sqrt(r*r-h*h);
  // sampling dependant computations
  vec2 q = vec2( length(p.xz), p.y );
  return ((h*q.x<w*q.y) ? length(q-vec2(w,h)) : 
                          abs(length(q)-r) ) - t;
}

// https://iquilezles.org/articles/distfunctions/
float sdOctahedron( vec3 p, float s) {
  p = abs(p);
  return (p.x+p.y+p.z-s)*0.57735027;
}

// https://iquilezles.org/articles/distfunctions/
float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h);
}

// https://iquilezles.org/articles/distfunctions/
float sdSphere(vec3 p, float s) {
  return length(p)-s;
}

// https://iquilezles.org/articles/distfunctions/
float sdBox( vec3 p, vec3 b ) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

mat2 rot2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

vec2 map(vec3 p) {
  vec3 shapePos = p - vec3(0.0, 1.0, 0.0);
  shapePos.xy *= rot2D(uSeconds);
  shapePos.yz *= rot2D(uSeconds);
  float shape1 = sdBox(shapePos, vec3(0.6));

  vec3 spherePos = vec3(cos(uSeconds) * 2.0, 1.0, 0.0);
  float sphere = sdSphere(p - spherePos, 0.25);
  float shape2 = sdSphere(p - vec3(5.0, 0.0, 0.0), 1.5);
  float shape3 = sdSphere(p - vec3(-4.0, 1.0, 2.0), 0.5);
  float shape4 = sdSphere(p - vec3(0.0, 3.0, -4.0), 1.0);

  shapePos = p - vec3(8.0, 2.0, -8.0);
  shapePos.xz *= rot2D(sin(uSeconds*2.3)*3.0);
  shapePos.yz *= rot2D(cos(uSeconds*1.2)*1.0);
  float shape5 = sdOctahedron(shapePos, 1.0);

  shapePos = p - vec3(-5.0, -1.0, -7.0);
  shapePos.xy *= rot2D(1.0);
  shapePos.yz *= rot2D(0.0);
  float shape6 = sdCutHollowSphere(shapePos , 1.0, 0.01, 0.01);

  shapePos = p - vec3(-10.0, 2.512, -15.0);
  shapePos.xz *= rot2D(0.8);
  float shape7 = sdBox(shapePos, vec3(6.0, 4.5, 0.3));

  float shape8 = sdSphere(p - vec3(sin(uSeconds)*7.0, -2.0, sin(uSeconds)*cos(uSeconds)*7.0), 0.8);

  float floor = p.y + 2.0;

  float blob = opSmoothUnion(sphere, shape1, 1.0);
  float d = min(opSmoothUnion(floor, shape8, 2.0), blob);
  d = min(shape2, d);
  d = min(shape3, d);
  d = min(shape4, d);
  d = min(shape5, d);
  d = min(shape6, d);
  d = min(shape7, d);

  float material = MAT_0;

  if (d == blob || abs(d - sphere) < SURF_DIST) {
    material = MAT_2;
  }

  if (abs(d - shape1) < SURF_DIST) {
    material = MAT_1;
  }

  if (d == shape2) {
    material = MAT_3;
  }

  if (d == shape3) {
    material = MAT_4;
  }

  if (d == shape4) {
    material = MAT_5;
  }

  if (d == shape7) {
    material = MAT_6;
  }

  return vec2(d, material);
}

vec3 norm(vec3 p) {
  vec2 d = map(p);
  vec2 e = vec2(0.01, 0.0);
  vec3 n = d.x - vec3(
    map(p - e.xyy).x,
    map(p - e.yxy).x,
    map(p - e.yyx).x
  );
  return normalize(n);
}

vec3 palette( float t,vec3 a, vec3 b, vec3 c, vec3 d ) {
    return a + b*cos( 6.28318*(c*t+d) );
}

vec2 march(vec3 rayOrigin, vec3 rayDirection) {
  float distance = 0.0;
  float material = MAT_0;

  for (int i=0; i < MAX_RAY_STEPS; i++) {
    vec3 position = rayOrigin + rayDirection * distance;

    vec2 mapOutput = map(position);
    distance += mapOutput.x;

    if (abs(mapOutput.x) < SURF_DIST || distance > MAX_DISTANCE) {
      material = mapOutput.y;
      break;
    }
  }

  return vec2(distance, material);
}

vec3 GetRayDirection(vec2 uv, vec3 p, vec3 l, float z) {
  vec3 f = normalize(l-p);
  vec3 r = normalize(cross(vec3(0,1,0), f));
  vec3 u = cross(f,r);
  vec3 c = p+f*z;
  vec3 i = c + uv.x*r + uv.y*u;
  return normalize(i-p);
}

vec3 Render(inout vec3 rayOrigin, inout vec3 rayDirection, inout vec3 reflection) {
  vec2 marchOutput = march(rayOrigin, rayDirection);
  float distance = marchOutput.x;
  float material = marchOutput.y;

  vec3 lightPosition = vec3(0.0, 6.0, 0.0);
  lightPosition.xz += vec2(cos(uSeconds), sin(uSeconds)) * 6.0;

  vec3 position = rayOrigin + rayDirection * distance;

  vec3 light = normalize(lightPosition - position);
  vec3 normal = norm(position);

  float diffuse = clamp(dot(normal, light), 0.0, 1.0);
  float lightDistance = march(position + normal * SURF_DIST*2.0, light).x;
  if (lightDistance < length(lightPosition - position)) {
    diffuse *= 0.4;
  }

  vec3 color = vec3(1.0);
  reflection = vec3(0.0);

  if (material == MAT_1) {
    diffuse = max(diffuse, 0.2);
    color = vec3(1.0, 0.0, 0.0);
  }

  if (material == MAT_2) {
    color = vec3(1.0);
    reflection = vec3(.98);
  }

  if (material == MAT_3) {
    diffuse = max(diffuse, 0.2);
    color = vec3(0.8, 0.8, 0.0);
    reflection = vec3(.98);
  }

  if (material == MAT_4) {
    diffuse = max(diffuse, 0.2);
    color = vec3(0.8, 0.0, 0.8);
    reflection = vec3(.98);
  }

  if (material == MAT_5) {
    diffuse = max(diffuse, 0.2);
    color = vec3(0.0, 0.8, 0.8);
    reflection = vec3(.98);
  }

  if (material == MAT_6) {
    color = vec3(1.0, 1.0, 1.0);
    reflection = vec3(.98);
    diffuse = 0.0;
  }

  rayOrigin = position + normal * SURF_DIST * 3.0;
  rayDirection = reflect(rayDirection, normal);

  return color*diffuse;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - resolution.xy) / resolution.y;
  vec2 mouse = uMouse.xy / resolution.xy;

  vec3 rayOrigin = vec3(0.0, 6.0, -3.0) * uMouse.z;
  rayOrigin.yz *= rot2D(-mouse.y*PI+1.);
  rayOrigin.xz *= rot2D(-mouse.x*TAU);
  rayOrigin.y = max(rayOrigin.y, -1.0);

  vec3 rayDirection = GetRayDirection(uv, rayOrigin, vec3(0.0, 1.0, 0.0),2.0);

  vec3 reflection = vec3(1.0);
  vec3 filt = vec3(1.0);
  vec3 color = vec3(0.0);

  for (int i=0; i < REFLECTION_BOUNCES; i++) {
    vec3 pass = Render(rayOrigin, rayDirection, reflection);
    color += pass.rgb*filt;
    filt *= reflection;

    // if the reflection is too weak
    if (abs(distance(vec3(0.0), reflection)) < 0.001) {
      break;
    }
  }

  gl_FragColor = vec4(color, 1.0);
}
