const shaders = /* wgsl */`
    struct DirectionalLight {
        ambientLight: vec4f,
        colour: vec4f,
        direction: vec4f
    }

    struct VertexIn {
        @location(0) position: vec4f,
        @location(1) normal: vec4f,
        @location(2) colour: vec4f,
        @location(3) uv: vec2f
    }

    struct VertexOut {
        @builtin(position) position : vec4f,
        @location(0) colour : vec4f,
        @location(1) uv: vec2f,
        @location(2) normal: vec4f
    }

    @group(0) @binding(0) var<uniform> transformMatrix: mat4x4<f32>;
    @group(0) @binding(1) var texSampler: sampler;
    @group(0) @binding(2) var cubeTexture: texture_2d<f32>;
    
    // @group(0) @binding(3) var<uniform> ambientLight: vec4f;
    @group(0) @binding(4) var<uniform> light: DirectionalLight;

    @vertex
    fn vertex_main(vertexData: VertexIn) -> VertexOut
    {
        var output : VertexOut;
        output.position = transformMatrix * vertexData.position;
        output.normal = normalize(transformMatrix * vertexData.normal);
        output.colour = vertexData.colour;
        output.uv = vertexData.uv;

        return output;
    }

    @fragment
    fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
    {
        var texColour = textureSample(cubeTexture, texSampler, fragData.uv);

        var normal = normalize(fragData.normal);
        var diffuse = max(dot(normal, light.direction), 0.0);

        return (light.ambientLight  + diffuse * light.colour) * texColour;
    }
`;

export default shaders;
