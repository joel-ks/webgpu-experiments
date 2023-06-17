import { mat4, type Mat4 } from "wgpu-matrix";
import WebGpuRenderer, { assetsBaseUrl, renderTextureMipLevels } from "../WebGpuRenderer";
import * as Cube from "./model";
import shaders from "./shaders";

const width = 500, height = 500;
const msaaSamples = 4;
const mat4SizeBytes = 4 * 4 * 4; // 4x4 matrix of 4-byte floats
const rotationVelocity = Math.PI / 6;
const bgColour: GPUColor = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };

export default class TexturedCube extends WebGpuRenderer {

    #msaaRenderTexView: GPUTextureView | null = null;
    #depthTexView: GPUTextureView | null = null;

    #vertexBuffer: GPUBuffer | null = null;
    #uniformBuffer: GPUBuffer | null = null;
    #cubeTextureView: GPUTextureView | null = null;
    #cubeTextureSampler: GPUSampler | null = null;

    #renderPipeline: GPURenderPipeline | null = null;
    #bindGroup: GPUBindGroup | null = null;

    #projectionMatrix: Mat4 = mat4.ortho(-2.0, 2.0, -2.0, 2.0, 0.0, -4.0);
    #rotateRads = 0;

    constructor(canvasContext: GPUCanvasContext, device: GPUDevice) {
        super(canvasContext, device);
    }

    async setup(presentationFormat: GPUTextureFormat): Promise<void> {
        this.#setupRenderTargets(presentationFormat);

        await this.#setupResources();

        const shaderModule = this._device.createShaderModule({
            label: "cube shaders",
            code: shaders
        });
        this.#setupPipeline(presentationFormat, shaderModule);
    }

    #setupRenderTargets(presentationFormat: GPUTextureFormat) {
        this._canvasContext.canvas.width = width;
        this._canvasContext.canvas.height = height;
        this._canvasContext.configure({
            device: this._device,
            format: presentationFormat,
            alphaMode: "premultiplied"
        });

        // MSAA support requires rendering to a multisampled texture
        // It will be resolved to the canvas current texture by the render
        const msaaRenderTex = this._device.createTexture({
            label: "cube msaa render texture",
            size: [
                this._canvasContext.canvas.width,
                this._canvasContext.canvas.height
            ],
            sampleCount: msaaSamples,
            format: presentationFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.#msaaRenderTexView = msaaRenderTex.createView({
            label: "cube msaa render texture view"
        });

        const depthTex = this._device.createTexture({
            label: "cube depth texture",
            size: [
                this._canvasContext.canvas.width,
                this._canvasContext.canvas.height
            ],
            sampleCount: msaaSamples,
            format: "depth16unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.#depthTexView = depthTex.createView({
            label: "cube depth texture view"
        });
    }

    async #setupResources() {
        this.#vertexBuffer = this._device.createBuffer({
            label: "cube vertices",
            size: Cube.cubeVertexArray.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this._device.queue.writeBuffer(this.#vertexBuffer, 0, Cube.cubeVertexArray, 0, Cube.cubeVertexArray.length);

        this.#uniformBuffer = this._device.createBuffer({
            label: "cube uniforms",
            size: mat4SizeBytes,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const texture = await this.#createTextureFromImageUrl(`${assetsBaseUrl}/Brick_Wall_019_basecolor.jpg`, "brick texture");
        this.#cubeTextureView = texture.createView();
        this.#cubeTextureSampler = this._device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
            mipmapFilter: "linear",
            maxAnisotropy: 4
        });
    }

    async #createTextureFromImageUrl(url: string, label?: string) {
        const response = await fetch(url);
        const bitmap = await createImageBitmap(await response.blob());

        const texDesc: GPUTextureDescriptor = {
            size: [bitmap.width, bitmap.height, 1],
            format: 'rgba8unorm',
            mipLevelCount: Math.floor(Math.log2(Math.max(bitmap.width, bitmap.height))) + 1,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST
        };
        if (label) texDesc.label = label;

        const texture = this._device.createTexture(texDesc);
        this._device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, texDesc.size);

        renderTextureMipLevels(this._device, texture, texDesc);

        return texture;
    }

    #setupPipeline(presentationFormat: GPUTextureFormat, shaderModule: GPUShaderModule) {
        if (!this.#uniformBuffer || !this.#cubeTextureSampler || !this.#cubeTextureView)
            throw Error("Error: uniform data has not been initialised");

        const vertexBufferLayout: GPUVertexBufferLayout = {
            attributes: [
                {
                    // Position
                    shaderLocation: 0,
                    offset: Cube.positionOffset,
                    format: "float32x4"
                },
                {
                    // Colour
                    shaderLocation: 1,
                    offset: Cube.colorOffset,
                    format: "float32x4"
                },

                {
                    // UV
                    shaderLocation: 2,
                    offset: Cube.uvOffset,
                    format: "float32x2"
                }
            ],
            arrayStride: Cube.vertexStride,
            stepMode: "vertex"
        };

        const pipelineDesc: GPURenderPipelineDescriptor = {
            label: "cube render pipeline",
            vertex: {
                module: shaderModule,
                entryPoint: "vertex_main",
                buffers: [vertexBufferLayout]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragment_main",
                targets: [
                    {
                        format: presentationFormat
                    }
                ]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "back"
            },
            layout: "auto",
            multisample: {
                count: msaaSamples
            },
            depthStencil: {
                format: "depth16unorm",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        };

        this.#renderPipeline = this._device.createRenderPipeline(pipelineDesc);

        // Using auto pipeline layout means we don't have to create bind group layouts
        // but we have to create bind groups after the pipeline for we can use the 
        // generated layouts
        this.#bindGroup = this._device.createBindGroup({
            label: "cube bind group",
            layout: this.#renderPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.#uniformBuffer,
                        offset: 0,
                        size: mat4SizeBytes
                    }
                },
                {
                    binding: 1,
                    resource: this.#cubeTextureSampler,
                },
                {
                    binding: 2,
                    resource: this.#cubeTextureView,
                },
            ]
        });
    }

    render(deltaTSec: number) {
        if (!this.#vertexBuffer || !this.#uniformBuffer
            || !this.#depthTexView || !this.#msaaRenderTexView
            || !this.#bindGroup || !this.#renderPipeline
        )
            throw Error("Renderer has not been set up");

        this.#updateTransform(deltaTSec);

        const commandEncoder = this._device.createCommandEncoder();

        const renderPassEncoder = commandEncoder.beginRenderPass({
            label: "cube render pass",
            colorAttachments: [
                {
                    view: this.#msaaRenderTexView,
                    resolveTarget: this._canvasContext.getCurrentTexture().createView(),
                    loadOp: "clear",
                    storeOp: "store",
                    clearValue: bgColour
                }
            ],
            depthStencilAttachment: {
                view: this.#depthTexView,
                depthLoadOp: "clear",
                depthStoreOp: "store",
                depthClearValue: 1.0
            }
        });
        renderPassEncoder.setPipeline(this.#renderPipeline);
        renderPassEncoder.setBindGroup(0, this.#bindGroup)
        renderPassEncoder.setVertexBuffer(0, this.#vertexBuffer);
        renderPassEncoder.draw(Cube.vertexCount);
        renderPassEncoder.end();

        this._device.queue.submit([commandEncoder.finish()]);
    }

    #updateTransform(deltaTSec: number) {
        this.#rotateRads += rotationVelocity * deltaTSec;

        const modelMatrix = mat4.translation([0.0, 0.0, 2.0]);
        mat4.rotate(modelMatrix, [0.6, 0.4, 0.2], this.#rotateRads, modelMatrix);

        const transformationMatrix = mat4.multiply(this.#projectionMatrix, modelMatrix) as Float32Array;
        this._device.queue.writeBuffer(this.#uniformBuffer!, 0, transformationMatrix, 0, transformationMatrix.length);
    }
}
