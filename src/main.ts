window.addEventListener("load", main);

const canvasElemId = "webgpu-target";

const bgColour: GPUColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };

const vertexData = new Float32Array([
    0.0, 0.6, 0, 1,     1, 0, 0, 1,
    -0.5, -0.6, 0, 1,   0, 1, 0, 1,
    0.5, -0.6, 0, 1,    0, 0, 1, 1
]);

const shaders = `
struct VertexOut {
    @builtin(position) position : vec4f,
    @location(0) color : vec4f
}

@vertex
fn vertex_main(@location(0) position: vec4f, @location(1) color: vec4f) -> VertexOut
{
    var output : VertexOut;
    output.position = position;
    output.color = color;
    return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
    return fragData.color;
}
`;


async function main() {
    console.log("Starting WebGPU test");

    // ********** INIT BROWSER RESOURCES **********
    const canvasElem = document.getElementById(canvasElemId) as HTMLCanvasElement;
    if (!canvasElem) throw Error(`Canvas element "${canvasElemId}" not found`);

    const canvasGpuContext = canvasElem.getContext("webgpu");
    if (!canvasGpuContext || !navigator.gpu) throw Error("WebGPU not supported in this browser");

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("Could not get GPU adapter");

    const device = await adapter.requestDevice();
    if (!device) throw new Error("Could not get GPU device");

    // ********** INIT WEBGPU RESOURCES **********
    canvasGpuContext.configure({
        device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: "premultiplied"
    });

    const shaderModule = device.createShaderModule({
        code: shaders
    });

    const vertexBuffer = device.createBuffer({
        size: vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertexData, 0, vertexData.length);

    // ********** SETUP PIPELINE **********
    const vertexBufferLayout: GPUVertexBufferLayout = {
        attributes: [
            {
                shaderLocation: 0,
                offset: 0,
                format: "float32x4" as const
            },
            {
                shaderLocation: 1,
                offset: 16,
                format: "float32x4" as const
            }
        ],
        arrayStride: 32,
        stepMode: "vertex"
    };

    const pipelineDesc: GPURenderPipelineDescriptor = {
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
            topology: "triangle-list"
        },
        layout: "auto"
    };

    const renderPipeline = device.createRenderPipeline(pipelineDesc);
    const commandEncoder = device.createCommandEncoder();

    // ********** Render **********
    const renderPassEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
            {
                clearValue: bgColour,
                loadOp: "clear" as const,
                storeOp: "store" as const,
                view: canvasGpuContext.getCurrentTexture().createView()
            }
        ]
    });

    renderPassEncoder.setPipeline(renderPipeline);
    renderPassEncoder.setVertexBuffer(0, vertexBuffer);
    renderPassEncoder.draw(3);
    renderPassEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
}

