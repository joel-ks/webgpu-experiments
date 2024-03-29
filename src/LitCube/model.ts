export const positionOffset = 0;
export const normalOffset = 4 * 4;
export const colorOffset = 4 * 8; // Byte offset of cube vertex color attribute.
export const uvOffset = 4 * 12;
export const vertexStride = 4 * 14; // Byte size of one cube vertex.
export const vertexCount = 36;

export const cubeVertexArray = new Float32Array([
//  position        normal          color           uv
    1, -1, 1, 1,    0, -1, 0, 1,    1, 0, 1, 1,     0, 1,
    -1, -1, 1, 1,   0, -1, 0, 1,    0, 0, 1, 1,     1, 1,
    -1, -1, -1, 1,  0, -1, 0, 1,    0, 0, 0, 1,     1, 0,
    1, -1, -1, 1,   0, -1, 0, 1,    1, 0, 0, 1,     0, 0,
    1, -1, 1, 1,    0, -1, 0, 1,    1, 0, 1, 1,     0, 1,
    -1, -1, -1, 1,  0, -1, 0, 1,    0, 0, 0, 1,     1, 0,

    1, 1, 1, 1,     1, 0, 0, 1,     1, 1, 1, 1,     0, 1,
    1, -1, 1, 1,    1, 0, 0, 1,     1, 0, 1, 1,     1, 1,
    1, -1, -1, 1,   1, 0, 0, 1,     1, 0, 0, 1,     1, 0,
    1, 1, -1, 1,    1, 0, 0, 1,     1, 1, 0, 1,     0, 0,
    1, 1, 1, 1,     1, 0, 0, 1,     1, 1, 1, 1,     0, 1,
    1, -1, -1, 1,   1, 0, 0, 1,     1, 0, 0, 1,     1, 0,

    -1, 1, 1, 1,    0, 1, 0, 1,     0, 1, 1, 1,     0, 1,
    1, 1, 1, 1,     0, 1, 0, 1,     1, 1, 1, 1,     1, 1,
    1, 1, -1, 1,    0, 1, 0, 1,     1, 1, 0, 1,     1, 0,
    -1, 1, -1, 1,   0, 1, 0, 1,     0, 1, 0, 1,     0, 0,
    -1, 1, 1, 1,    0, 1, 0, 1,     0, 1, 1, 1,     0, 1,
    1, 1, -1, 1,    0, 1, 0, 1,     1, 1, 0, 1,     1, 0,

    -1, -1, 1, 1,   -1, 0, 0, 1,    0, 0, 1, 1,     0, 1,
    -1, 1, 1, 1,    -1, 0, 0, 1,    0, 1, 1, 1,     1, 1,
    -1, 1, -1, 1,   -1, 0, 0, 1,    0, 1, 0, 1,     1, 0,
    -1, -1, -1, 1,  -1, 0, 0, 1,    0, 0, 0, 1,     0, 0,
    -1, -1, 1, 1,   -1, 0, 0, 1,    0, 0, 1, 1,     0, 1,
    -1, 1, -1, 1,   -1, 0, 0, 1,    0, 1, 0, 1,     1, 0,

    1, 1, 1, 1,     0, 0, 1, 1,     1, 1, 1, 1,     0, 1,
    -1, 1, 1, 1,    0, 0, 1, 1,     0, 1, 1, 1,     1, 1,
    -1, -1, 1, 1,   0, 0, 1, 1,     0, 0, 1, 1,     1, 0,
    -1, -1, 1, 1,   0, 0, 1, 1,     0, 0, 1, 1,     1, 0,
    1, -1, 1, 1,    0, 0, 1, 1,     1, 0, 1, 1,     0, 0,
    1, 1, 1, 1,     0, 0, 1, 1,     1, 1, 1, 1,     0, 1,

    1, -1, -1, 1,   0, 0, -1, 1,    1, 0, 0, 1,     0, 1,
    -1, -1, -1, 1,  0, 0, -1, 1,    0, 0, 0, 1,     1, 1,
    -1, 1, -1, 1,   0, 0, -1, 1,    0, 1, 0, 1,     1, 0,
    1, 1, -1, 1,    0, 0, -1, 1,    1, 1, 0, 1,     0, 0,
    1, -1, -1, 1,   0, 0, -1, 1,    1, 0, 0, 1,     0, 1,
    -1, 1, -1, 1,   0, 0, -1, 1,    0, 1, 0, 1,     1, 0,
]);

export const ambientLightOffset = 0;
export const directionalLightOffset = 4 * 4;
export const lightData = new Float32Array([
    0.15, 0.15, 0.15, 1.0,  // ambient light level
    0.9, 0.9, 0.9, 1.0,     // directional light level
    0.5, 0.5, -1.0, 1.0     // directional light direction
]);
