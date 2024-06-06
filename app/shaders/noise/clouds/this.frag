precision mediump float;
precision mediump sampler2D;
precision mediump sampler3D;

#define PI 3.141592
#define MAX_RAY_STEPS 100
#define MAX_DISTANCE 100.0
#define SURF_DIST 0.001

uniform float uSeconds;
uniform vec2 uResolution;
uniform sampler2D uTexture;
uniform int uFrame;
uniform sampler3D uChannelA;
uniform sampler2D blueNoise;

const float CLOUD_FALLOFF = 1.0;
const float CLOUD_EXPOSURE = 1.0;
const float CLOUD_DENSITY = 10.0;
const float CLOUD_BASE_STRENGTH = 0.8;
const float CLOUD_DETAIL_STRENGTH = 0.2;
const float CLOUD_LIGHT_MULTIPLIER = 7.4;
const float CLOUD_LIGHT_STEPS = 16.0;
const float CLOUD_STEPS_MIN = 16.0;
const float CLOUD_STEPS_MAX = 128.0;

const int HQ_NUM_COUNT = 4;
const float SHAPE_SIZE = 10.3;
const float DETAIL_SIZE = 31.0;
const float MAX_LIGHT_DIST = 1.7;
const float GOLDEN_RATIO = 1.61803398875;
const float DUAL_LOBE_WEIGHT = 0.7;

const vec3 EXTINCTION_MULT = vec3(0.9);
const vec3 CLOUD_LIGHT_DIR = normalize(vec3(-1.0, 0.0, 0.0));
const float AMBIENT_STRENGTH = 0.75;
const vec3 COLOR_SUNSET = vec3(0.97, 0.83, 0.64);
const vec3 SUNSET_ORANGE = vec3(227.0, 168.0, 87.0) / 255.0;
const vec3 SUNSET_BLUE = vec3(31.0, 63.0, 128.0) / 255.0;
const vec3 GROUND_COLOR = vec3(0.15);
const vec3 CLOUD_COLOUR = vec3(0.98, 0.96, 0.96);

// https://iquilezles.org/articles/distfunctions/
float sdBox( vec3 p, vec3 b ) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

// https://iquilezles.org/articles/distfunctions/
float sdTorus( vec3 p, vec2 t ) {
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

// https://iquilezles.org/articles/distfunctions/
float sdBoxFrame( vec3 p, vec3 b, float e ) {
       p = abs(p  )-b;
  vec3 q = abs(p+e)-e;
  return min(min(
      length(max(vec3(p.x,q.y,q.z),0.0))+min(max(p.x,max(q.y,q.z)),0.0),
      length(max(vec3(q.x,p.y,q.z),0.0))+min(max(q.x,max(p.y,q.z)),0.0)),
      length(max(vec3(q.x,q.y,p.z),0.0))+min(max(q.x,max(q.y,p.z)),0.0));
}

// https://iquilezles.org/articles/distfunctions/
float opSmoothUnion( float d1, float d2, float k ) {
  float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
  return mix( d2, d1, h ) - k*h*(1.0-h);
}

float circularOut(float t) {
  return sqrt((2.0 - t) * t);
}

float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

vec3 saturate3(vec3 x) {
  return clamp(x, vec3(0.0), vec3(1.0));
}

float linearstep(float minValue, float maxValue, float v) {
  return clamp((v - minValue) / (maxValue - minValue), 0.0, 1.0);
}

float inverseLerp(float minValue, float maxValue, float v) {
  return (v - minValue) / (maxValue - minValue);
}

float remap(float v, float inMin, float inMax, float outMin, float outMax) {
  float t = inverseLerp(inMin, inMax, v);
  return mix(outMin, outMax, t);
}

vec4 SamplePerlinWorleyNoise(vec3 pos) {
  vec3 coord = pos.xzy * vec3(1.0 / 32.0, 1.0 / 32.0, 1.0 / 64.0) * 1.0;
  return texture(uChannelA, coord);
}

float HenyeyGreenstein(float g, float mu) {
  float gg = g * g;
	return (1.0 / (4.0 * PI))  * ((1.0 - gg) / pow(1.0 + gg - 2.0 * g * mu, 1.5));
}

float DualHenyeyGreenstein(float g, float costh) {
  return mix(HenyeyGreenstein(-g, costh), HenyeyGreenstein(g, costh), DUAL_LOBE_WEIGHT);
}

vec3 angularRepeat(vec3 m, float n) {
  float astep  = 2.*3.1415/n;
  float origin = -astep*0.5;
  float angle  = atan(m.z, m.x) - origin;

  angle = origin + mod(angle, astep);

  float r = length(m.xz);

  return vec3(cos(angle)*r, m.y, sin(angle)*r);
}

float RenderGlow(float dist, float radius, float intensity) {
  dist = max(dist, 1e-6);
  return (1.0 - exp(-25.0 * (radius / dist))) * 0.1 + (1.0 - exp(-0.05 * (radius / dist) * (radius / dist))) * 2.0;
}

vec3 RenderSky(vec3 dir) {
  float x = -(dir.x - 1.0) / 2.0;

  float ground = pow(smoothstep(0.0, 1.0, dir.y + 1.01), 10.0);
  float skyT1 = pow(smoothstep(0.0, 1.0, x), 0.5);
  float skyT2 = pow(smoothstep(0.5, 1.0, x), 1.0);
  float skyT3 = pow(smoothstep(0.0, 1.0, dir.x-0.5), 1.0);

  vec3 sky = mix(SUNSET_BLUE * 0.25, SUNSET_ORANGE, skyT1);
  sky = mix(sky, COLOR_SUNSET * 1.25, skyT2);
  sky = mix(sky, SUNSET_BLUE * 0.15, skyT3);
  sky = mix(GROUND_COLOR, sky, ground);

  float mu = remap(dot(dir, CLOUD_LIGHT_DIR), -1.0, 1.0, 1.0, 0.0);
  return sky + RenderGlow(mu, 0.0001, 0.3);
}

mat2 rot2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

float CloudShape(vec3 p) {
  float s1 = max(pow(sin(uSeconds * 0.2) * 0.5 + 0.5, 2.0), 0.001);
  float s2 = max(pow(sin(uSeconds *0.2 + 2.09) * 0.5 + 0.5, 2.0), 0.001);
  float s3 = max(pow(sin(uSeconds * 0.2 + 4.18) * 0.5 + 0.5, 2.0), 0.001);

  float box = sdBox(p/s1, vec3(2.5)) * s1;
  float oct = sdBoxFrame(p/s3, vec3(2.5), 1.0) * s3;

  p.xz *= rot2D(0.7);
  p.yz *= rot2D(1.2);
  float torus = sdTorus(p/s2, vec2(1.7, 1.3)) * s2;

  return opSmoothUnion(oct, opSmoothUnion(box, torus, 1.0), 1.0);
}

float MarchBoundingBox(vec3 rayOrigin, vec3 rayDirection, float factor) {
  float distance = 0.0;
  float mapOutput = 0.0;
  for (int i=0; i < MAX_RAY_STEPS; i++) {
    vec3 position = rayOrigin + rayDirection * distance;

    mapOutput = sdBox(position, vec3(3.0)) * factor;
    distance += mapOutput;

    if (abs(mapOutput) < SURF_DIST || distance > MAX_DISTANCE) {
      break;
    }
  }

  return distance;
}

vec3 MultipleOctaveScattering(float density, float mu) {
  float attenuation = 0.2;
  float contribution = 0.2;
  float phaseAttenuation = 0.5;

  float a = 1.0;
  float b = 1.0;
  float c = 1.0;
  float g = 0.85;
  const float scatteringOctaves = 4.0;

  vec3 luminance = vec3(0.0);

  for (float i = 0.0; i < scatteringOctaves; i++) {
    float phaseFunction = DualHenyeyGreenstein(0.3 * c, mu);
    vec3 beers = exp(-density * EXTINCTION_MULT * a);

    luminance += b * phaseFunction * beers;

    a *= attenuation;
    b *= contribution;
    c *= (1.0 - phaseAttenuation);
  }
  return luminance;
}

float SampleHighResolutionCloudDetail(float cloudSDF, vec3 worldPos, vec3 cameraOrigin, float curTime) {
  float cloud = circularOut(linearstep(0.0, -CLOUD_FALLOFF, cloudSDF)) * 0.85;

  if (cloud > 0.0) {
    vec3 samplePos = worldPos + vec3(-2.0 * curTime, 0.0, curTime) * 1.5;
    vec4 perlinWorleySample = SamplePerlinWorleyNoise(samplePos * SHAPE_SIZE);
    cloud = saturate(remap(cloud, CLOUD_BASE_STRENGTH * perlinWorleySample.x, 1.0, 0.0, 1.0));

    if(cloud > 0.0) {
      float t_detailDropout = smoothstep(1000.0, 800.0, distance(cameraOrigin, worldPos));

      if (t_detailDropout > 0.0) {
        samplePos += vec3(4.0 * curTime, 3.0 * curTime, 2.0 * curTime) * 0.01;

        float detailStrength = CLOUD_DETAIL_STRENGTH * t_detailDropout;
        float detail = SamplePerlinWorleyNoise(DETAIL_SIZE * samplePos).y;
        cloud = saturate(remap(cloud, detailStrength * detail, 1.0, 0.0, 1.0));
      }
    }
  }

  return cloud * CLOUD_DENSITY;
}

vec3 GetRayDirection(vec2 uv, vec3 p, vec3 l, float z) {
  vec3 f = normalize(l-p);
  vec3 r = normalize(cross(vec3(0,1,0), f));
  vec3 u = cross(f,r);
  vec3 c = p+f*z;
  vec3 i = c + uv.x*r + uv.y*u;
  return normalize(i-p);
}

vec3 CalculateLightEnergy(vec3 lightOrigin, vec3 lightDirection, vec3 cameraOrigin, float mu, float maxDistance, float curTime) {
  float stepLength = maxDistance / CLOUD_LIGHT_STEPS;
  float lightRayDensity = 0.0;
  float distAccumulated = 0.0;

  for(float j = 0.0; j < CLOUD_LIGHT_STEPS; j++) {
    vec3 lightSamplePos = lightOrigin + lightDirection * distAccumulated;
    lightRayDensity += SampleHighResolutionCloudDetail(CloudShape(lightSamplePos), lightSamplePos, cameraOrigin, curTime) * stepLength;
    distAccumulated += stepLength;
  }

  vec3 beersLaw = MultipleOctaveScattering(lightRayDensity, mu);
  vec3 powder = 1.0 - exp(-lightRayDensity * 2.0 * EXTINCTION_MULT);

  return beersLaw * mix(2.0 * powder, vec3(1.0), remap(mu, -1.0, 1.0, 0.0, 1.0));
}

vec3 Render(vec3 rayOrigin, vec3 rayDirection) {
  float marchDistance = MarchBoundingBox(rayOrigin, rayDirection, 1.0);
  vec3 pixel = RenderSky(rayDirection);

  if (marchDistance >= MAX_DISTANCE) {
    return pixel;
  }

  vec3 sunLight = COLOR_SUNSET * CLOUD_LIGHT_MULTIPLIER;
  vec3 ambient = vec3(AMBIENT_STRENGTH * COLOR_SUNSET);

  vec3 enterPosition = rayOrigin + rayDirection * marchDistance + rayDirection * 1.1;
  float innerDistance = MarchBoundingBox(enterPosition, rayDirection, -1.0);

  vec2 aspect = vec2(1.0, uResolution.y / uResolution.x);
  float blueNoiseSample = texture2D(blueNoise, (gl_FragCoord.xy / uResolution + 0.5) * aspect * (uResolution.x / 32.0)).x;
  blueNoiseSample = fract(blueNoiseSample + float(uFrame % 32) * GOLDEN_RATIO);

  float mu = dot(rayDirection, CLOUD_LIGHT_DIR);
  float phaseFunction = DualHenyeyGreenstein(0.3, mu);

  float lqStepLength = innerDistance / CLOUD_STEPS_MIN;
  float hqStepLength = lqStepLength / float(HQ_NUM_COUNT);

  float offset = lqStepLength * blueNoiseSample * 0.0001;
  float distTravelled = 0.0;

  int hqMarcherCountdown = 0;
  float curTime = uSeconds * 0.05;

  vec3 scattering = vec3(0.0);
  vec3 transmittance = vec3(1.0);

  for (float i = 0.0; i < CLOUD_STEPS_MAX; i++) {
    if (distTravelled > innerDistance) {
      break;
    }

    vec3 samplePos = enterPosition + rayDirection * distTravelled;
    float cloudMapSDFSample = CloudShape(samplePos);

    if (hqMarcherCountdown <= 0) {
      if (cloudMapSDFSample < hqStepLength) {
        hqMarcherCountdown = HQ_NUM_COUNT;
        distTravelled += hqStepLength * blueNoiseSample;
      } else {
        distTravelled += cloudMapSDFSample;
        continue;
      }
    }

    if (hqMarcherCountdown > 0) {
      hqMarcherCountdown--;

      if (cloudMapSDFSample < 0.0) {
        hqMarcherCountdown = HQ_NUM_COUNT;

        float extinction = SampleHighResolutionCloudDetail(cloudMapSDFSample, samplePos, rayOrigin, curTime);

        if (extinction > 0.01) {
          vec3 luminance = ambient + sunLight * CalculateLightEnergy(samplePos, CLOUD_LIGHT_DIR, rayOrigin, mu, MAX_LIGHT_DIST, curTime);
          vec3 xtransmittance = exp(-extinction * hqStepLength * EXTINCTION_MULT);
          vec3 integScatt = extinction * (luminance - luminance * xtransmittance) / extinction;

          scattering += transmittance * integScatt;
          transmittance *= xtransmittance;

          if (length(transmittance) <= 0.01) {
              transmittance = vec3(0.0);
              break;
          }
        }
      }

      distTravelled += hqStepLength;
    }
  }

  scattering = scattering * CLOUD_COLOUR;
  transmittance = saturate3(transmittance);

  return pixel.xyz * transmittance.rgb + scattering.rgb * CLOUD_EXPOSURE;
}

// The strategies employed here are based on the following resources:
// https://youtu.be/Qj_tK_mdRcA?feature=shared
// https://github.com/simondevyoutube/Shaders_Clouds1
void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;

  vec3 rayOrigin = cameraPosition;
  vec3 rayDirection = GetRayDirection(uv, rayOrigin, vec3(0.0, 0.0, 0.0), 2.0);

  gl_FragColor = vec4(Render(rayOrigin, rayDirection), 1.0);
}
