precision highp float;
precision highp sampler2D;

uniform float uSeconds;
uniform vec2 uResolution;
uniform sampler2D uTexture;

#define PI 3.141592
#define MAX_RAY_STEPS 100
#define MAX_DISTANCE 100.0
#define SURF_DIST 0.001
#define INDEX_OF_REFRACTION 1.12
#define INVERSE_INDEX_OF_REFRACTION 1.0/INDEX_OF_REFRACTION
#define ABERRATION 0.01

vec3 angularRepeat(vec3 m, float n) {
  float astep  = 2.*3.1415/n;
  float origin = -astep*0.5;
  float angle  = atan(m.z, m.x) - origin;

  angle = origin + mod(angle, astep);

  float r = length(m.xz);

  return vec3(cos(angle)*r, m.y, sin(angle)*r);
}

float sdDiamond(vec3 m) {
  m = angularRepeat(m, 8.0);

  vec2 p = m.xy;

  const float h1 = 4.0;
  const float h2 = 3.0;

  const vec2 origin = vec2(3.0,0);
  const vec2 normal1 = normalize(vec2(h1,-3.0));
  const vec2 normal2 = normalize(vec2(h2,3.0));

  float d1 = dot(p-origin, normal1);
  float d2 = dot(p-origin, normal2);

  float d = max(d1, d2);
  float vdist = max(m.y - h2*0.4, -h1-m.y);

  return max(d, vdist);
}


mat2 rot2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

float map(vec3 p) {
  p.xz *= rot2D(uSeconds*0.2);
  p.yz *= rot2D(1.0);
  p.y -= 1.0;

  return sdDiamond(p - vec3(0.0, 1.0, 0.0));
}

vec2 xyz2equirect(vec3 d) {
    return vec2(atan(d.z, d.x) + PI, acos(-d.y)) / vec2(2.0 * PI, PI);
}

vec4 sampleEquirect(sampler2D tex, vec3 dir) { 
    vec2 st = xyz2equirect(dir);
    st.y = 1.0-st.y;
    return texture2D(tex, st);
}

vec3 norm(vec3 p) {
  float d = map(p);
  vec2 e = vec2(0.001, 0.0);
  vec3 n = d - vec3(
    map(p - e.xyy),
    map(p - e.yxy),
    map(p - e.yyx)
  );
  return normalize(n);
}

float March(vec3 rayOrigin, vec3 rayDirection, float factor) {
  float distance = 0.0;

  for (int i=0; i < MAX_RAY_STEPS; i++) {
    vec3 position = rayOrigin + rayDirection * distance;

    float mapOutput = map(position) * factor;
    distance += mapOutput;

    if (abs(mapOutput) < SURF_DIST || distance > MAX_DISTANCE) {
      break;
    }
  }

  return distance;
}

vec3 GetRayDirection(vec2 uv, vec3 p, vec3 l, float z) {
  vec3 f = normalize(l-p);
  vec3 r = normalize(cross(vec3(0,1,0), f));
  vec3 u = cross(f,r);
  vec3 c = p+f*z;
  vec3 i = c + uv.x*r + uv.y*u;
  return normalize(i-p);
}

vec3 Render(vec3 rayOrigin, vec3 rayDirection) {
  float marchDistance = March(rayOrigin, rayDirection, 1.0);

  if (marchDistance < MAX_DISTANCE) {
    vec3 position = rayOrigin + rayDirection * marchDistance;
    vec3 enterNormal = norm(position);

    vec3 enterRayDireciton = refract(rayDirection, enterNormal, INVERSE_INDEX_OF_REFRACTION);

    vec3 enterPosition = position - enterNormal * SURF_DIST * 3.0;
    float innerDistance = March(enterPosition, enterRayDireciton, -1.0);
    vec3 outPosition = enterPosition + enterRayDireciton * innerDistance;

    vec3 outNormal = -norm(outPosition);

    vec3 rayDirectionOut = refract(enterRayDireciton, outNormal, INDEX_OF_REFRACTION - ABERRATION);
    if (dot(rayDirectionOut, rayDirectionOut) == 0.0) {
      rayDirectionOut = reflect(enterRayDireciton, outNormal);
    }
    vec3 color = vec3(0.0);
    color.r = sampleEquirect(uTexture, rayDirectionOut).r;

    rayDirectionOut = refract(enterRayDireciton, outNormal, INDEX_OF_REFRACTION);
    if (dot(rayDirectionOut, rayDirectionOut) == 0.0) {
      rayDirectionOut = reflect(enterRayDireciton, outNormal);
    }
    color.g = sampleEquirect(uTexture, rayDirectionOut).g;

    rayDirectionOut = refract(enterRayDireciton, outNormal, INDEX_OF_REFRACTION + ABERRATION);
    if (dot(rayDirectionOut, rayDirectionOut) == 0.0) {
      rayDirectionOut = reflect(enterRayDireciton, outNormal);
    }
    color.b = sampleEquirect(uTexture, rayDirectionOut).b;

    float density = 0.1;
    float optDist = exp(-innerDistance*density);

    color = color * optDist * vec3(0.96, 0.93, 0.99);

    vec3 reflection = reflect(rayDirection, enterNormal);
    vec3 reflectionOutside = sampleEquirect(uTexture, reflection).rgb;
    float fresnel = pow(1.+dot(rayDirection, enterNormal), 4.0);
    return mix(color, reflectionOutside, fresnel);
  }

  return sampleEquirect(uTexture, rayDirection).rgb;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 0.5 - uResolution.xy) / uResolution.y;

  vec3 rayOrigin = cameraPosition;
  vec3 rayDirection = GetRayDirection(uv, rayOrigin, vec3(0.0, 1.0, 0.0),2.0);
  vec3 color = Render(rayOrigin, rayDirection);

  // if screen is wider than tall, adjust uv for aspect ratio for vignette
  if (uResolution.x > uResolution.y) {
    uv = (gl_FragCoord.xy * 0.5 - uResolution.xy) / uResolution.x;
  }

  float vignetteRadius = 1.0;
  float vignettePower = smoothstep(vignetteRadius, vignetteRadius-0.5, length(uv));
  color = mix(color, color * vignettePower, 0.5);

  gl_FragColor = vec4(color, 1.0);
}
