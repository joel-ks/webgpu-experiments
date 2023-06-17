const shaders = /* wgsl */`
    struct VertexIn {
        @location(0) position: vec4f,
        @location(1) colour: vec4f,
        @location(2) uv: vec2f
    }

    struct VertexOut {
        @builtin(position) position : vec4f,
        @location(0) colour : vec4f,
        @location(1) uv: vec2f
    }

    @group(0) @binding(0) var<uniform> transformMatrix: mat4x4<f32>;
    @group(0) @binding(1) var texSampler: sampler;
    @group(0) @binding(2) var cubeTexture: texture_2d<f32>;

    @vertex
    fn vertex_main(vertexData: VertexIn) -> VertexOut
    {
        var output : VertexOut;
        output.position = transformMatrix * vertexData.position;
        output.colour = vertexData.colour;
        output.uv = vertexData.uv;

        return output;
    }

    @fragment
    fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
    {
        // Use the texture uniforms so teh compiler doesn't throw them away
        var texel = textureSample(cubeTexture, texSampler, fragData.uv);
        return texel;// * fragData.colour;
    }
`;

export default shaders;
