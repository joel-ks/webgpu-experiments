export default abstract class WebGpuRenderer {
    _canvasContext: GPUCanvasContext;
    _device: GPUDevice;

    constructor(canvasContext: GPUCanvasContext, device: GPUDevice) {
        this._canvasContext = canvasContext;
        this._device = device;
    }

    abstract setup(presentationFormat: GPUTextureFormat): Promise<void>;
    abstract render(deltaTSecs: number): void;
}

export const assetsBaseUrl = "/assets";

// Based on https://toji.dev/webgpu-best-practices/img-textures#generating-mipmaps
// TextureDescriptor should be the descriptor that the texture was created with.
// This version only works for basic 2D textures.
export function renderTextureMipLevels(device: GPUDevice, texture: GPUTexture, textureDescriptor: GPUTextureDescriptor) {
    // Create a simple shader that renders a fullscreen textured quad.
    const mipLevelGeneratorShader = /* wgsl */ `
        var<private> pos : array<vec2f, 4> = array<vec2f, 4>(
            vec2f(-1, 1), vec2f(1, 1),
            vec2f(-1, -1), vec2f(1, -1)
        );
    
        struct VertexOutput {
            @builtin(position) position : vec4f,
            @location(0) texCoord : vec2f
        };
    
        @vertex
        fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
            var output : VertexOutput;
            output.texCoord = pos[vertexIndex] * vec2f(0.5, -0.5) + vec2f(0.5);
            output.position = vec4f(pos[vertexIndex], 0, 1);
            return output;
        }
    
        @group(0) @binding(0) var imgSampler : sampler;
        @group(0) @binding(1) var img : texture_2d<f32>;
    
        @fragment
        fn fragmentMain(@location(0) texCoord : vec2f) -> @location(0) vec4f {
            return textureSample(img, imgSampler, texCoord);
        }
    `;
    const mipmapShaderModule = device.createShaderModule({ 
        label: "mipmap generation shader module",
        code: mipLevelGeneratorShader
    });

    const pipeline = device.createRenderPipeline({
        label: "mipmap generation render pipeline",
        vertex: {
            module: mipmapShaderModule,
            entryPoint: 'vertexMain',
        },
        fragment: {
            module: mipmapShaderModule,
            entryPoint: 'fragmentMain',
            targets: [{
                format: textureDescriptor.format // Make sure to use the same format as the texture
            }],
        },
        primitive: {
            topology: 'triangle-strip',
            stripIndexFormat: 'uint32',
        },
        layout: "auto"
    });

    // We'll ALWAYS be rendering minified here, so that's the only filter mode we need to set.
    const sampler = device.createSampler({ minFilter: 'linear' });

    let srcView = texture.createView({
        label: "mipmap generation texture level 0 view",
        baseMipLevel: 0,
        mipLevelCount: 1
    });

    // Loop through each mip level and renders the previous level's contents into it.
    const commandEncoder = device.createCommandEncoder({ label: "mipmap generation command encoder" });
    for (let i = 1; i < textureDescriptor.mipLevelCount!; ++i) {
        const dstView = texture.createView({
            label: `mipmap generation texture level ${i} view`,
            baseMipLevel: i,  // Make sure we're getting the right mip level...
            mipLevelCount: 1, // And only selecting one mip level
        });

        const passEncoder = commandEncoder.beginRenderPass({
            label: `mipmap generation pass ${i} render`,
            colorAttachments: [{
                view: dstView, // Render pass uses the next mip level as it's render attachment.
                loadOp: 'clear',
                clearValue: [0, 0, 0, 0],
                storeOp: 'store'
            }],
        });

        // Need a separate bind group for each level to ensure
        // we're only sampling from the previous level.
        const bindGroup = device.createBindGroup({
            label: `mipmap generation pass ${i} bind group`,
            layout: pipeline.getBindGroupLayout(0),
            entries: [{
                binding: 0,
                resource: sampler,
            }, {
                binding: 1,
                resource: srcView,
            }],
        });

        // Render
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.draw(4);
        passEncoder.end();

        // The source texture view for the next iteration of the loop is the
        // destination view for this one.
        srcView = dstView;
    }
    device.queue.submit([commandEncoder.finish()]);
}
