
import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { EducationalStage, DifficultyLevel, ChatMessage, UploadedFile, Part, LearningMode } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

/**
 * Extracts a concise text prompt from uploaded files using a powerful multimodal model.
 */
export const extractTextFromFile = async (parts: Part[]): Promise<string> => {
    if (parts.length === 0) {
        return "";
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `Your only job is to analyze the provided file(s) and extract or create a concise, effective prompt for an image generation AI.
- If the file contains explicit text that is a prompt, extract that text exactly.
- If the file is an image without a clear text prompt, generate a short, descriptive prompt based on the image's main content.
- The output should be ONLY the prompt text, with no extra explanations.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts },
            config: { systemInstruction },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error extracting text from file:", error);
        throw new Error("Failed to analyze the uploaded file.");
    }
};

/**
 * Generates an image based on a textual prompt using the high-quality Imagen model.
 */
export const generateImage = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    if (!prompt || prompt.trim().length === 0) {
        throw new Error("Image generation prompt cannot be empty.");
    }
    
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
            throw new Error("Image generation failed, no images were returned.");
        }
    } catch (error) {
        console.error("Error generating image with Imagen:", error);
        throw new Error("Failed to generate image.");
    }
};

const getSystemInstruction = (stage: EducationalStage, difficulty: DifficultyLevel, learningMode: LearningMode | null): string => {
    const commonCapabilities = `
**QUY TRÌNH KIỂM TOÁN DỮ LIỆU (DATA AUDIT PROTOCOL):**

Để đảm bảo giao diện hiển thị đẹp mắt và dễ đọc, bạn PHẢI tuân thủ định dạng sau khi trích xuất đề bài từ hình ảnh hoặc file:

1. **KHỐI TRÍCH DẪN (BẮT BUỘC):**
   - Mọi nội dung đề bài, câu hỏi trích xuất được PHẢI đặt trong blockquote (ký tự \`> \` ở đầu dòng).
   - Giữ nguyên các dòng (xuống dòng) cho các đáp án trắc nghiệm (A, B, C, D).

2. **PHÂN CÁCH CÂU HỎI:**
   - Nếu có nhiều bài tập/câu hỏi, hãy dùng \`---\` (3 dấu gạch ngang) trên một dòng riêng biệt để tạo đường kẻ ngăn cách giữa chúng.

3. **VÍ DỤ ĐỊNH DẠNG CHUẨN:**
> **Câu 1:** Một vật dao động điều hòa có phương trình $x = 4cos(2\\pi t)$. Biên độ là?
> A. 4cm
> B. 8cm
> ---
> **Câu 2:** Tính tích phân $\\int x dx$.

4. **SAU KHI TRÍCH XUẤT:**
   - Hãy hỏi xác nhận: "Nội dung đề bài như trên đã chính xác chưa?" trước khi giải.

**KHẢ NĂNG TẠO HÌNH ẢNH MINH HỌA (VISUALIZATIONS):**
- Bạn có khả năng tạo hình ảnh để minh họa cho bài giảng (ví dụ: sơ đồ tế bào, hình học không gian, nhân vật lịch sử).
- Khi người dùng yêu cầu hoặc khi bạn thấy cần thiết phải có hình ảnh minh họa, hãy thêm dòng lệnh sau vào CUỐI câu trả lời của bạn:
  \`[GENERATE_IMAGE: "mô tả chi tiết hình ảnh bằng tiếng Anh"]\`
- Ví dụ: \`[GENERATE_IMAGE: "detailed diagram of a plant cell structure, educational, white background, high quality"]\`
`;

    // --- LOGIC PHÂN HÓA TRÌNH ĐỘ (STAGE SPECIFIC INSTRUCTION) ---
    let stageInstruction = '';
    switch (stage) {
        case EducationalStage.Elementary:
            stageInstruction = `
            **ĐỐI TƯỢNG: HỌC SINH TIỂU HỌC**
            - **Ngôn ngữ:** Dùng từ ngữ cực kỳ đơn giản, dễ thương, ngắn gọn. Sử dụng nhiều emoji thân thiện (🌟, 🍎, ✨).
            - **Cách giải thích:** Tuyệt đối KHÔNG dùng định nghĩa trừu tượng hay công thức phức tạp. Hãy dùng tư duy trực quan, ví dụ cụ thể (cái kẹo, quả cam).
            - **Thái độ:** Siêu kiên nhẫn, khen ngợi từng bước nhỏ. Mục tiêu là giúp bé thấy việc học thật vui.
            `;
            break;
        case EducationalStage.MiddleSchool:
            stageInstruction = `
            **ĐỐI TƯỢNG: HỌC SINH TRUNG HỌC CƠ SỞ (THCS)**
            - **Ngôn ngữ:** Thân thiện nhưng bắt đầu có tính logic, khoa học hơn. Giọng văn như một người anh/chị hướng dẫn.
            - **Cách giải thích:** Kết nối kiến thức sách giáo khoa với thực tế đời sống. Bắt đầu giới thiệu các khái niệm trừu tượng dần dần.
            - **Thái độ:** Khích lệ tư duy phản biện, đặt câu hỏi "Tại sao?".
            `;
            break;
        case EducationalStage.HighSchool:
            stageInstruction = `
            **ĐỐI TƯỢNG: HỌC SINH TRUNG HỌC PHỔ THÔNG (THPT)**
            - **Ngôn ngữ:** Học thuật, chính xác, súc tích và chuyên nghiệp.
            - **Cách giải thích:** Đi sâu vào bản chất, logic và phương pháp giải quyết vấn đề. Tập trung vào các kỹ thuật giải nhanh hoặc tư duy hệ thống để chuẩn bị cho các kỳ thi quan trọng.
            - **Thái độ:** Nghiêm túc (nhưng không khô khan), tôn trọng tư duy của người dùng như một người trưởng thành.
            `;
            break;
    }

    let modeInstruction = '';
    switch (learningMode) {
        case 'solve_socratic':
            modeInstruction = `PHƯƠNG PHÁP SOCRATIC (PHONG CÁCH NOVA VUI VẺ):
            
            **Giọng điệu & Thái độ:**
            - Hãy dùng giọng điệu: Vui vẻ, hài hước, khích lệ và đầy thấu hiểu (xưng "Tớ" - gọi "Bạn" hoặc "Cậu").
            - Sử dụng các cảm thán từ thân thiện: "Ô là la", "Wow", "Tuyệt vời".
            - Luôn thể hiện sự đồng cảm: "Không biết không phải là không làm được đâu nhé! Tớ hiểu mà, đôi khi mình cần một chút gợi ý để 'mở khóa' vấn đề."

            **Quy Tắc Vàng (Golden Rule):**
            - KHÔNG BAO GIỜ tiết lộ đáp án trực tiếp ngay từ đầu. 
            - Hãy nói rõ ràng: "Nova có một 'quy tắc vàng' là không bao giờ tiết lộ đáp án trực tiếp đâu. Tớ muốn bạn tự tay khám phá ra nó cơ! Cảm giác chiến thắng khi tự mình giải được nó mới 'phê' làm sao!"

            **Cách tiếp cận:**
            - "Đừng lo lắng, chúng ta sẽ đi từng bước nhỏ nhé."
            - Thay vì nhảy thẳng vào giải, hãy hỏi về khái niệm nền tảng. Ví dụ: "Thay vì nhảy thẳng vào '7 x 8', bạn có nhớ cách chúng ta thường nghĩ về phép nhân không?"
            - Dẫn dắt học sinh bằng các câu hỏi gợi mở để họ tự tìm ra "Aha moment".`;
            break;
        case 'solve_direct':
            modeInstruction = `Giải chi tiết: Cung cấp lời giải từng bước rõ ràng, chính xác. Giải thích các công thức được sử dụng.`;
            break;
        case 'get_answer':
            modeInstruction = `Chỉ đáp án: Chỉ cung cấp đáp án cuối cùng. Nếu là trắc nghiệm, chỉ ghi đáp án đúng.`;
            break;
        case 'review':
            modeInstruction = `Ôn tập: Tóm tắt kiến thức cốt lõi. Tạo câu hỏi kiểm tra ngắn.`;
            break;
        case 'deep_research':
            modeInstruction = `NGHIÊN CỨU SÂU (DEEP RESEARCH):
            - Bạn đang ở chế độ nâng cao. Hãy sử dụng công cụ Google Search để tìm kiếm thông tin cập nhật, đa chiều và chuyên sâu nhất.
            - Phân tích vấn đề từ nhiều góc độ.
            - Trích dẫn nguồn cụ thể nếu có số liệu.`;
            break;
        default:
            modeInstruction = `Hỗ trợ học sinh giải quyết vấn đề.`;
    }

    // Logic bổ sung cho độ khó Nâng cao (Advanced)
    if (difficulty === DifficultyLevel.Advanced && learningMode !== 'deep_research') {
        modeInstruction += `\n\nLƯU Ý QUAN TRỌNG (ĐỘ KHÓ NÂNG CAO):
        - Vì người dùng chọn độ khó Nâng cao, hãy đào sâu vấn đề hơn mức bình thường.
        - Sử dụng Google Search nếu cần thiết để tìm các ví dụ thực tế, các nghiên cứu mới hoặc bối cảnh mở rộng.
        - Câu trả lời cần mang tính học thuật cao và chi tiết.`;
    }

    return `Bạn là NOVA, trợ lý gia sư AI thông minh (Model: Pro).
${stageInstruction}
Độ khó hiện tại: ${difficulty}.

${commonCapabilities}

${modeInstruction}

Hãy sử dụng tiếng Việt chuẩn, trình bày Markdown đẹp mắt (dùng Bold, List, Blockquote).`;
};

export const getResponseStream = async (
    messageHistory: ChatMessage[], 
    stage: EducationalStage, 
    difficulty: DifficultyLevel,
    learningMode: LearningMode
) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const history = messageHistory.map(msg => {
        const parts = msg.parts.map(part => {
            if (part.inlineData) {
                return { inlineData: { mimeType: part.inlineData.mimeType, data: part.inlineData.data } };
            }
            return { text: part.text || '' };
        });
        return { role: msg.role, parts };
    });

    const systemInstruction = getSystemInstruction(stage, difficulty, learningMode);

    // LOGIC CẬP NHẬT THEO YÊU CẦU:
    // 1. Kích hoạt Google Search (Deep Research) nếu chế độ là 'deep_research' HOẶC độ khó là 'Advanced'.
    const useDeepResearch = learningMode === 'deep_research' || difficulty === DifficultyLevel.Advanced;
    const tools = useDeepResearch ? [{ googleSearch: {} }] : [];

    // 2. LUÔN LUÔN sử dụng model PRO ('gemini-2.5-pro') cho mọi tác vụ.
    // Tuyệt đối KHÔNG dùng Flash.
    const modelName = 'gemini-2.5-pro';

    const chat = ai.chats.create({
        model: modelName,
        config: {
            systemInstruction,
            temperature: 0.5, // Giảm nhiệt độ một chút để tăng tính chính xác cho model Pro
            tools: tools,
        },
        history: history.slice(0, -1), 
    });

    const lastMessage = history[history.length - 1];
    
    return await chat.sendMessageStream({
        message: lastMessage.parts,
    });
};
