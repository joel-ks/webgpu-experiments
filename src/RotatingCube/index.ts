import { mat4 } from "wgpu-matrix";
import type { Mat4 } from "wgpu-matrix";

import { indices, vertexColourOffset, vertexPositionOffset, vertexStride, vertices } from "./model";
import shaders from "./shaders";
import WebGpuRenderer from "../WebGpuRenderer";

const width = 500, height = 500;
const msaaSamples = 4;
const mat4SizeBytes = 64;
const rotationVelocity = Math.PI / 6;

const bgColour: GPUColor = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };

export default class RotatingCube extends WebGpuRenderer {
    #renderPipeline: GPURenderPipeline | null = null;

    #uniformBindGroup: GPUBindGroup | null = null;

    #vertexBuffer: GPUBuffer | null = null;
    #indexBuffer: GPUBuffer | null = null;
    #uniformBuffer: GPUBuffer | null = null;

    #msaaRenderTexView: GPUTextureView | null = null;
    #depthTexView: GPUTextureView | null = null;

    #projectionMatrix: Mat4 = mat4.ortho(-2.0, 2.0, -2.0, 2.0, 0.0, -4.0);
    #rotateRads = 0;

    constructor(canvasContext: GPUCanvasContext, device: GPUDevice) {
        super(canvasContext, device);

        this._canvasContext.canvas.width = width;
        this._canvasContext.canvas.height = height;
    }

    setup(preferredCanvasFormat: GPUTextureFormat) {
        console.log("Setting up to render SimpleCube...");

        // ********** SETUP RENDER TARGETS **********
        this._canvasContext.canvas.width = width;
        this._canvasContext.canvas.height = height;
        this._canvasContext.configure({
            device: this._device,
            format: preferredCanvasFormat,
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
            format: preferredCanvasFormat,
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

        // ********** SETUP RESOURCES **********
        const shaderModule = this._device.createShaderModule({
            label: "cube shaders",
            code: shaders
        });

        this.#vertexBuffer = this._device.createBuffer({
            label: "cube vertices",
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this._device.queue.writeBuffer(this.#vertexBuffer, 0, vertices, 0, vertices.length);

        this.#indexBuffer = this._device.createBuffer({
            label: "cube indices",
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });
        this._device.queue.writeBuffer(this.#indexBuffer, 0, indices, 0, indices.length);

        this.#uniformBuffer = this._device.createBuffer({
            label: "cube uniforms",
            size: mat4SizeBytes,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // ********** SETUP PIPELINE **********
        const vertexBufferLayout: GPUVertexBufferLayout = {
            attributes: [
                {
                    // Position
                    shaderLocation: 0,
                    offset: vertexPositionOffset,
                    format: "float32x4"
                },
                {
                    // Colour
                    shaderLocation: 1,
                    offset: vertexColourOffset,
                    format: "float32x4"
                }
            ],
            arrayStride: vertexStride,
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
                        format: navigator.gpu.getPreferredCanvasFormat()
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
        this.#uniformBindGroup = this._device.createBindGroup({
            label: "cube uniform bind group",
            layout: this.#renderPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.#uniformBuffer,
                        offset: 0,
                        size: mat4SizeBytes
                    }
                }
            ]
        });
    }

    render(deltaTSec: number) {
        if (!this.#vertexBuffer || !this.#indexBuffer || !this.#uniformBuffer
            || !this.#depthTexView || !this.#msaaRenderTexView
            || !this.#uniformBindGroup || !this.#renderPipeline
        )
            throw Error("Renderer has not been set up");

        // ********** UPDATE TRANSFORM **********
        this.#rotateRads += rotationVelocity * deltaTSec;

        const modelMatrix = mat4.translation([0.0, 0.0, 2.0]);
        mat4.rotate(modelMatrix, [0.6, 0.4, 0.2], this.#rotateRads, modelMatrix);

        const transformationMatrix = mat4.multiply(this.#projectionMatrix, modelMatrix) as Float32Array;
        this._device.queue.writeBuffer(this.#uniformBuffer, 0, transformationMatrix, 0, transformationMatrix.length);

        // ********** DO RENDER **********
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
        renderPassEncoder.setBindGroup(0, this.#uniformBindGroup)
        renderPassEncoder.setVertexBuffer(0, this.#vertexBuffer);
        renderPassEncoder.setIndexBuffer(this.#indexBuffer, "uint32");
        renderPassEncoder.drawIndexed(indices.length)
        renderPassEncoder.end();

        this._device.queue.submit([commandEncoder.finish()]);
    }
}
