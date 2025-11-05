import { UploadedFile } from '../types';

/**
 * Creates a PDF document from an array of uploaded image files.
 * Each image is placed on a new page, centered and scaled to fit.
 * @param imageFiles An array of UploadedFile objects, which must be images.
 * @returns A Promise that resolves with the base64 encoded string of the generated PDF.
 */
export const createPdfFromImages = async (imageFiles: UploadedFile[]): Promise<string> => {
    // jsPDF is loaded from a CDN script in index.html, so we access it via the window object.
    const { jsPDF } = window.jspdf;
    
    // Initialize PDF with A4 page size and pixel units for easier calculations.
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4',
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        if (!file.type.startsWith('image/')) continue;

        const imgData = `data:${file.type};base64,${file.base64Data}`;
        
        // Use an Image object to get natural dimensions
        const img = new Image();
        img.src = imgData;
        await new Promise(resolve => { img.onload = resolve; });

        const imgWidth = img.width;
        const imgHeight = img.height;
        
        // Calculate the best-fit ratio to scale the image without distortion
        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);

        const newWidth = imgWidth * ratio;
        const newHeight = imgHeight * ratio;
        
        // Center the image on the page
        const x = (pageWidth - newWidth) / 2;
        const y = (pageHeight - newHeight) / 2;
        
        // Add a new page for each image after the first one
        if (i > 0) {
            doc.addPage();
        }
        
        // Add the image to the document
        const imageType = file.type.split('/')[1]?.toUpperCase() || 'JPEG';
        doc.addImage(imgData, imageType, x, y, newWidth, newHeight);
    }

    // Return the base64 data string of the generated PDF, without the data URI prefix.
    return doc.output('datauristring').split(',')[1];
};
