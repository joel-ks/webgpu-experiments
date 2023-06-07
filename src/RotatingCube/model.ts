export const vertices = new Float32Array([
    // positions            colours
    1.0, 1.0, -1.0, 1.0,    1.0, 1.0, 0.0, 1.0,
    1.0, -1.0, -1.0, 1.0,   1.0, 0.0, 0.0, 1.0,
    1.0, 1.0, 1.0, 1.0,     1.0, 1.0, 1.0, 1.0,
    1.0, -1.0, 1.0, 1.0,    1.0, 0.0, 1.0, 1.0,
    -1.0, 1.0, -1.0, 1.0,   0.0, 1.0, 0.0, 1.0,
    -1.0, -1.0, -1.0, 1.0,  0.0, 0.0, 0.0, 1.0,
    -1.0, 1.0, 1.0, 1.0,    0.0, 1.0, 1.0, 1.0,
    -1.0, -1.0, 1.0, 1.0,   0.0, 0.0, 1.0, 1.0
]);

export const vertexPositionOffset = 0;
export const vertexColourOffset = 16;
export const vertexStride = 32;

export const indices = new Uint32Array([
    4, 2, 0,
    2, 7, 3,
    6, 5, 7,
    1, 7, 5,
    0, 3, 1,
    4, 1, 5,
    4, 6, 2,
    2, 6, 7,
    6, 4, 5,
    1, 3, 7,
    0, 2, 3,
    4, 0, 1
]);
