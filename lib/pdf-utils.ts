// @ts-ignore - pdf2json doesn't have TypeScript types
const PDFParser = require('pdf2json');

/**
 * Extract text content from a PDF file
 * @param buffer PDF file as Buffer or base64 data URL
 * @returns Extracted text content
 */
export async function extractPdfText(buffer: Buffer | string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // If input is base64 data URL, convert to buffer
      let pdfBuffer: Buffer;
      
      if (typeof buffer === 'string') {
        // Remove data URL prefix if present (e.g., "data:application/pdf;base64,...")
        const base64Data = buffer.includes('base64,') 
          ? buffer.split('base64,')[1] 
          : buffer;
        pdfBuffer = Buffer.from(base64Data, 'base64');
      } else {
        pdfBuffer = buffer;
      }

      const pdfParser = new PDFParser();
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from all pages
          const text = pdfData.Pages.map((page: any) => {
            return page.Texts.map((textItem: any) => {
              return textItem.R.map((r: any) => decodeURIComponent(r.T)).join(' ');
            }).join(' ');
          }).join('\n\n');
          
          resolve(text || '');
        } catch (err) {
          reject(new Error(`Failed to parse PDF data: ${err instanceof Error ? err.message : 'Unknown error'}`));
        }
      });
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        reject(new Error(`PDF parsing error: ${errData.parserError || 'Unknown error'}`));
      });
      
      pdfParser.parseBuffer(pdfBuffer);
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      reject(new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

/**
 * Get PDF metadata (number of pages, etc.)
 * @param buffer PDF file as Buffer or base64 data URL
 * @returns PDF metadata
 */
export async function getPdfMetadata(buffer: Buffer | string): Promise<{
  pages: number;
  info?: any;
}> {
  return new Promise((resolve, reject) => {
    try {
      let pdfBuffer: Buffer;
      
      if (typeof buffer === 'string') {
        const base64Data = buffer.includes('base64,') 
          ? buffer.split('base64,')[1] 
          : buffer;
        pdfBuffer = Buffer.from(base64Data, 'base64');
      } else {
        pdfBuffer = buffer;
      }

      const pdfParser = new PDFParser();
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        resolve({
          pages: pdfData.Pages?.length || 0,
          info: pdfData.Meta || {},
        });
      });
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        reject(new Error(`PDF parsing error: ${errData.parserError || 'Unknown error'}`));
      });
      
      pdfParser.parseBuffer(pdfBuffer);
    } catch (error) {
      console.error('Error reading PDF metadata:', error);
      reject(new Error(`Failed to read PDF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}
