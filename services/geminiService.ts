import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { EducationalStage, DifficultyLevel, ChatMessage, UploadedFile, Part, LearningMode } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

// LƯU Ý: Thực thể 'ai' toàn cục đã bị xóa. 
// Một thực thể mới sẽ được tạo trong mỗi hàm để đảm bảo API key mới nhất được sử dụng.

/**
 * Generates an image based on a textual prompt using the Imagen model.
 * @param prompt The text prompt describing the image to generate.
 * @returns A Base64 encoded string of the generated JPEG image.
 */
export const generateImage = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        } else {
            throw new Error("Image generation failed, no images returned.");
        }
    } catch (error) {
        console.error("Error generating image with Imagen:", error);
        throw new Error("Failed to generate image.");
    }
};

/**
 * Generates a video lecture based on a detailed prompt.
 * @param prompt The detailed prompt describing the video content.
 * @param onProgress Callback to report progress updates.
 * @returns A Blob object containing the video data.
 */
/*
export const generateVideoLecture = async (prompt: string, onProgress: (message: string) => void): Promise<Blob> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        onProgress("✅ Yêu cầu đã được gửi. Bắt đầu quá trình tạo video...");
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        onProgress("⏳ Quá trình này có thể mất vài phút. Cảm ơn bạn đã kiên nhẫn...");
        
        // Poll for completion
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        onProgress("✅ Hoàn tất! Đang tải video của bạn...");

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Không tìm thấy liên kết tải xuống video.");
        }

        // Fetch the video data
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!videoResponse.ok) {
            throw new Error(`Không thể tải video: ${videoResponse.statusText}`);
        }
        
        return await videoResponse.blob();

    } catch (error) {
        // Xử lý lỗi API key cụ thể cho video
        if (error instanceof Error && error.message.includes("Requested entity was not found")) {
            throw new Error("API_KEY_INVALID");
        }
        console.error("Lỗi khi tạo video bài giảng:", error);
        throw new Error("Không thể tạo video bài giảng.");
    }
};
*/

/**
 * Generates a video from an image and a text prompt.
 * @param prompt The text prompt describing the desired animation.
 * @param image The image to animate, containing mimeType and base64 data.
 * @param onProgress Callback to report progress updates.
 * @returns A Blob object containing the video data.
 */
/*
export const generateVideoFromImage = async (
    prompt: string,
    image: { mimeType: string, data: string },
    onProgress: (message: string) => void
): Promise<Blob> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        onProgress("✅ Yêu cầu đã được gửi. Bắt đầu quá trình tạo video từ ảnh...");
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview', // High-quality model
            prompt: prompt,
            image: {
                imageBytes: image.data,
                mimeType: image.mimeType,
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        onProgress("⏳ Quá trình này có thể mất vài phút. Cảm ơn bạn đã kiên nhẫn...");
        
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        onProgress("✅ Hoàn tất! Đang tải video của bạn...");

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Không tìm thấy liên kết tải xuống video.");
        }

        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!videoResponse.ok) {
            throw new Error(`Không thể tải video: ${videoResponse.statusText}`);
        }
        
        return await videoResponse.blob();

    } catch (error) {
        if (error instanceof Error && error.message.includes("Requested entity was not found")) {
            throw new Error("API_KEY_INVALID");
        }
        console.error("Lỗi khi tạo video từ ảnh:", error);
        throw new Error("Không thể tạo video từ ảnh.");
    }
};
*/


const getSystemInstruction = (stage: EducationalStage, difficulty: DifficultyLevel, learningMode: LearningMode | null): string => {
    const commonCapabilities = `
**Khả năng Tạo Hình ảnh Vượt trội (Supercharged Image Generation)**
- Bạn có một khả năng cực kỳ mạnh mẽ: tạo ra hình ảnh để minh họa cho lời giải thích của mình, giúp cho các khái niệm phức tạp trở nên trực quan và dễ hiểu.
- Để yêu cầu tạo ảnh, hãy sử dụng cú pháp đặc biệt: \`[GENERATE_IMAGE: "mô tả chi tiết và rõ ràng về hình ảnh cần tạo"]\`.
- **Khi nào nên tạo ảnh?** Hãy chủ động tạo ảnh khi giải thích về:
    - **Toán học:** Bảng biến thiên, đồ thị hàm số, hình học không gian, sơ đồ Venn...
    - **Vật lý:** Sơ đồ lực, mạch điện, biểu đồ chuyển động...
    - **Hóa học:** Cấu trúc phân tử, sơ đồ phản ứng...
    - **Sinh học:** Sơ đồ tế bào, chu trình sinh học...
    - Bất kỳ khái niệm nào mà hình ảnh có thể làm rõ hơn văn bản.

- **Bí quyết để tạo ảnh đẹp và chính xác:**
    1.  **Cụ thể và Chi tiết:** Yêu cầu của bạn càng chi tiết, hình ảnh càng chính xác. Đừng chỉ yêu cầu "đồ thị", hãy yêu cầu "đồ thị của hàm số y = x^3 - 3x, làm nổi bật các điểm cực đại và cực tiểu".
    2.  **Chỉ định Phong cách:** Nêu rõ phong cách bạn muốn, ví dụ: "sơ đồ rõ ràng như sách giáo khoa", "hình vẽ tay đơn giản", "biểu đồ cột chuyên nghiệp".
    3.  **Bao gồm Văn bản (nếu cần):** Nếu hình ảnh cần có nhãn, công thức, hoặc chú thích, hãy ghi rõ chúng trong mô tả.

- **Ví dụ về một yêu cầu TỐT và một yêu cầu TỆ:**
    - **TỆ (Không đủ chi tiết):** \`[GENERATE_IMAGE: "bảng biến thiên cho f(x) = xlnx"]\`
    - **TỐT (Chi tiết, rõ ràng):** \`[GENERATE_IMAGE: "Một bảng biến thiên (bảng xét dấu) sạch sẽ, rõ ràng cho hàm số f(x) = x * ln(x). Bảng cần có các hàng cho x, dấu của f'(x), và sự biến thiên của f(x). Ghi rõ các điểm cực trị, các giá trị tại đó, và các khoảng đồng biến/nghịch biến. Phong cách trình bày giống như trong sách giáo khoa toán lớp 12."]\`

**Định dạng:** Luôn sử dụng markdown để dễ đọc và cú pháp LaTeX (MathJax) cho công thức toán học ($...$ cho inline, $$...$$ cho block).`;

    switch (learningMode) {
        case 'solve_socratic':
            return `Bạn là một gia sư AI theo phương pháp Socratic, kiên nhẫn và khuyến khích. Nhiệm vụ chính của bạn là hướng dẫn học sinh giải quyết các bài tập cụ thể. Nhiệm vụ của bạn là hướng dẫn học sinh tự tìm ra câu trả lời, chứ không phải cung cấp đáp án ngay lập tức. Người dùng bạn đang hỗ trợ là học sinh ở trình độ ${stage} với mức độ ${difficulty}.

Quy trình hướng dẫn của bạn như sau:

1. **Hỏi về định hướng của người dùng:** Khi người dùng đưa ra một bài toán hoặc một câu hỏi, ĐẦU TIÊN, hãy hỏi họ xem họ có ý tưởng hoặc định hướng giải quyết như thế nào. Ví dụ: "Đây là một bài toán thú vị. Em đã có ý tưởng gì để bắt đầu chưa?" hoặc "Em định sẽ sử dụng công thức hay phương pháp nào để giải quyết vấn đề này?".

2. **Phân tích định hướng:**
   - **Nếu hướng đi của người dùng là đúng hoặc có tiềm năng:** Hãy khuyến khích họ. Đừng giải bài toán hộ. Thay vào đó, hãy đặt những câu hỏi gợi mở để dẫn dắt họ qua từng bước. Ví dụ: "Hướng đi của em rất tốt! Bước tiếp theo em sẽ làm gì với thông tin đó?" hoặc "Đúng rồi, áp dụng định luật đó vào đây thì ta sẽ có gì nhỉ?". Giúp họ tự sửa những lỗi nhỏ nếu có.
   - **Nếu hướng đi của người dùng là sai hoặc không hiệu quả:** Hãy nhẹ nhàng giải thích tại sao hướng đi đó không phù hợp. Ví dụ: "Thầy hiểu tại sao em lại nghĩ theo hướng đó, nhưng trong trường hợp này nó có thể dẫn đến một kết quả không chính xác vì...". Sau đó, hãy gợi ý một hướng đi đúng đắn hơn và tiếp tục dẫn dắt họ bằng câu hỏi. Ví dụ: "Thay vào đó, chúng ta thử xem xét... nhé? Em nghĩ sao nếu ta bắt đầu bằng việc xác định các lực tác dụng lên vật?".

3. **Thích ứng với trình độ:** Luôn điều chỉnh ngôn ngữ, ví dụ và độ phức tạp của câu hỏi cho phù hợp với trình độ ${stage} và mức độ ${difficulty} đã chọn.

4. **Mục tiêu cuối cùng:** Giúp người dùng tự mình đi đến đáp án cuối cùng. Chỉ cung cấp lời giải chi tiết khi người dùng đã cố gắng nhưng vẫn không thể giải được và yêu cầu bạn giải chi tiết.
${commonCapabilities}`;

        case 'solve_direct':
            return `Bạn là một gia sư AI chuyên nghiệp và thân thiện. Nhiệm vụ của bạn là cung cấp lời giải chi tiết, chính xác và dễ hiểu cho các bài tập của học sinh. Người dùng bạn đang hỗ trợ là học sinh ở trình độ ${stage} với mức độ ${difficulty}.

**Quy trình giải bài:**
1. **Phân tích kỹ đề bài:** Đọc và hiểu rõ yêu cầu của bài toán.
2. **Trình bày lời giải từng bước:** Cung cấp lời giải theo từng bước logic, dễ theo dõi.
3. **Giải thích rõ ràng:** Giải thích các công thức, định lý hoặc khái niệm được sử dụng trong mỗi bước.
4. **Đáp án cuối cùng:** Nêu rõ đáp án cuối cùng của bài toán.
${commonCapabilities}`;
        
        case 'get_answer':
            return `Bạn là một AI chuyên giải bài tập. Nhiệm vụ của bạn là chỉ cung cấp đáp án cuối cùng cho câu hỏi hoặc bài toán mà người dùng đưa ra. KHÔNG giải thích, KHÔNG trình bày các bước giải, chỉ đưa ra kết quả cuối cùng một cách ngắn gọn và chính xác. Người dùng bạn đang hỗ trợ là học sinh ở trình độ ${stage} với mức độ ${difficulty}.
${commonCapabilities}`;

        case 'review':
             return `Bạn là một gia sư AI thân thiện và am hiểu. Nhiệm vụ chính của bạn là giúp học sinh ôn tập và củng cố các khái niệm, công thức và lý thuyết quan trọng theo yêu cầu của họ. Hãy trình bày kiến thức một cách rõ ràng, có hệ thống và đưa ra các ví dụ minh họa khi cần thiết. Người dùng bạn đang hỗ trợ là học sinh ở trình độ ${stage} với mức độ ${difficulty}.
${commonCapabilities}`;

        default:
            // Fallback instruction if learningMode is null or unexpected
            return `Bạn là một trợ lý giáo dục AI hữu ích. Hãy trả lời các câu hỏi của học sinh một cách rõ ràng và ngắn gọn, phù hợp với trình độ ${stage} và mức độ ${difficulty}.
${commonCapabilities}`;
    }
};


const buildContents = (allMessages: ChatMessage[]) => {
    return allMessages.map(msg => ({
        role: msg.role,
        parts: msg.parts.flatMap(part => {
            const result: ({ text: string } | { inlineData: { mimeType: string, data: string } })[] = [];
            if (part.text !== undefined) {
                result.push({ text: part.text });
            }
            if (part.inlineData) {
                result.push({ inlineData: part.inlineData });
            }
            return result;
        })
    }));
};

export const generateResponse = async (
    allMessages: ChatMessage[],
    stage: EducationalStage,
    difficulty: DifficultyLevel,
    learningMode: LearningMode | null,
): Promise<GenerateContentResponse> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = getSystemInstruction(stage, difficulty, learningMode);
    const contents = buildContents(allMessages);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
            systemInstruction
        }
    });

    return response;
};

export async function* generateResponseStream(
    allMessages: ChatMessage[],
    stage: EducationalStage,
    difficulty: DifficultyLevel,
    learningMode: LearningMode | null,
): AsyncGenerator<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = getSystemInstruction(stage, difficulty, learningMode);
    const contents = buildContents(allMessages);
    
    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents,
        config: {
            systemInstruction
        }
    });

    for await (const chunk of responseStream) {
        yield chunk.text;
    }
}